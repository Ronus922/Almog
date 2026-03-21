import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// ─── עזר: נרמול מספר דירה ───────────────────────────────────────────────────
function normalizeApt(raw) {
  if (raw === null || raw === undefined) return null;
  return String(raw).trim().replace(/^0+/, '') || String(raw).trim();
}

// ─── עזר: נרמול מספר (הסרת פסיקים/רווחים/₪) ─────────────────────────────
function parseNum(val) {
  if (val === null || val === undefined || val === '') return null;
  const cleaned = String(val).replace(/[₪,\s]/g, '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

// ─── עזר: מיפוי שדות מנתוני Bllink לשדות DebtorRecord ──────────────────────
function mapBllinkRowToDebtor(apt, data) {
  const result = { apartmentNumber: apt };

  // שם בעל הדירה
  if (data.ownerName) result.ownerName = String(data.ownerName).trim();
  if (data.owner_name) result.ownerName = String(data.owner_name).trim();
  if (data.firstName || data.lastName) {
    const n = [data.firstName, data.lastName].filter(Boolean).join(' ').trim();
    if (n) result.ownerName = n;
  }

  // טלפונים
  const ownerPhone = data.ownerPhone || data.owner_phone || data.phone || data.phoneNumber;
  if (ownerPhone) result.phoneOwner = String(ownerPhone).trim();

  const tenantPhone = data.tenantPhone || data.tenant_phone;
  if (tenantPhone) result.phoneTenant = String(tenantPhone).trim();

  // חובות
  const total = parseNum(data.totalDebt ?? data.total_debt ?? data.debt ?? data.debtAmount ?? data.debt_amount);
  if (total !== null) result.totalDebt = total;

  const monthly = parseNum(data.monthlyDebt ?? data.monthly_debt ?? data.managementFee ?? data.management_fee);
  if (monthly !== null) result.monthlyDebt = monthly;

  const special = parseNum(data.specialDebt ?? data.special_debt ?? data.extraDebt ?? data.extra_debt);
  if (special !== null) result.specialDebt = special;

  // חודשי פיגור
  const months = parseNum(data.monthsInArrears ?? data.months_in_arrears ?? data.arrearsMonths ?? data.arrears_months);
  if (months !== null) result.monthsInArrears = months;

  // פרטי חוב
  if (data.detailsMonthly || data.details_monthly) result.detailsMonthly = String(data.detailsMonthly || data.details_monthly).trim();
  if (data.detailsSpecial || data.details_special) result.detailsSpecial = String(data.detailsSpecial || data.details_special).trim();
  if (data.managementMonthsRaw || data.management_months_raw) result.managementMonthsRaw = String(data.managementMonthsRaw || data.management_months_raw).trim();

  // הערות
  const notes = data.notes || data.comment || data.comments;
  if (notes) result.notes = String(notes).trim();

  return result;
}

// ─── עזר: שלח התראה לכל האדמינים ───────────────────────────────────────────
async function notifyAdmins(base44, title, message, priority = 'normal') {
  try {
    const users = await base44.asServiceRole.entities.AppUser.list();
    const admins = users.filter(u => ['ADMIN', 'SUPER_ADMIN'].includes(u.role) && u.is_active !== false);
    await Promise.all(admins.map(u =>
      base44.asServiceRole.entities.Notification.create({
        user_username: u.username,
        type: 'task_assigned',
        title,
        message,
        source_module: 'tasks',
        source_entity_type: 'ImportRun',
        action_url: '/Import',
        priority,
        is_read: false,
        dedupe_key: `import_result:${u.username}:${new Date().toISOString().slice(0, 10)}`,
      }).catch(() => {})
    ));
  } catch (e) {
    console.warn('[notify] Failed to notify admins:', e.message);
  }
}

Deno.serve(async (req) => {
  const startedAt = new Date().toISOString();
  const base44 = createClientFromRequest(req);

  // ── פרמטרים ──────────────────────────────────────────────────────────────
  let body = {};
  try { body = await req.json(); } catch {}
  const runType = body.run_type || 'manual';
  const triggeredBy = body.triggered_by || 'system';

  // ── Secrets ───────────────────────────────────────────────────────────────
  const BLLINK_USERNAME = Deno.env.get('BLLINK_USERNAME');
  const BLLINK_PASSWORD = Deno.env.get('BLLINK_PASSWORD');
  const BUILDING_ID = 'udnp';
  const API_BASE = 'https://api.bllink.co';

  if (!BLLINK_USERNAME || !BLLINK_PASSWORD) {
    return Response.json({ error: 'BLLINK_USERNAME / BLLINK_PASSWORD חסרים ב-Secrets' }, { status: 500 });
  }

  let logId = null;
  let logData = {
    importRunId: `bllink-${Date.now()}`,
    fileName: `bllink-api-${BUILDING_ID}`,
    startedAt,
    status: 'RUNNING',
    stage: 'LOGIN',
    totalRowsRead: 0,
    uniqueApartments: 0,
    successRowsCount: 0,
    createdCount: 0,
    updatedCount: 0,
    failedRowsCount: 0,
    skippedRowsCount: 0,
    importMode: 'fill_missing',
    errorSummary: '',
    errorDetails: [],
  };

  try {
    // יצירת רשומת לוג התחלתית
    const logRecord = await base44.asServiceRole.entities.ImportRun.create(logData);
    logId = logRecord.id;

    // ── שלב 1: התחברות ל-Bllink ──────────────────────────────────────────
    console.log('[Import] שלב 1: התחברות ל-Bllink...');

    // ניסיון כל endpoints אפשריים של Bllink הישראלית
    const loginEndpoints = [
      { url: `${API_BASE}/api/v1/managers/login`, body: { username: BLLINK_USERNAME, password: BLLINK_PASSWORD } },
      { url: `${API_BASE}/api/v1/auth/managers/login`, body: { username: BLLINK_USERNAME, password: BLLINK_PASSWORD } },
      { url: `${API_BASE}/auth/login`, body: { username: BLLINK_USERNAME, password: BLLINK_PASSWORD } },
      { url: `${API_BASE}/api/v1/login`, body: { username: BLLINK_USERNAME, password: BLLINK_PASSWORD } },
      { url: `https://app.bllink.co/api/managers/login`, body: { username: BLLINK_USERNAME, password: BLLINK_PASSWORD } },
    ];

    let loginJson = null;
    let loginAttempts = [];
    for (const ep of loginEndpoints) {
      const r = await fetch(ep.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ep.body),
      });
      const bodyText = await r.text();
      loginAttempts.push({ url: ep.url, status: r.status, body: bodyText.slice(0, 200) });
      console.log(`[Login] ${ep.url} → ${r.status}: ${bodyText.slice(0, 150)}`);
      if (r.ok) {
        try { loginJson = JSON.parse(bodyText); } catch {}
        if (loginJson?.token || loginJson?.access_token || loginJson?.accessToken || loginJson?.data?.token) break;
      }
    }

    if (!loginJson) {
      throw new Error(`התחברות ל-Bllink נכשלה בכל endpoints. ניסיונות: ${JSON.stringify(loginAttempts)}`);
    }

    const token = loginJson?.token || loginJson?.access_token || loginJson?.accessToken || loginJson?.data?.token;
    if (!token) {
      throw new Error(`לא התקבל token מ-Bllink. תשובה: ${JSON.stringify(loginJson).slice(0, 300)}`);
    }
    console.log('[Import] ✓ התחברות הצליחה, token התקבל');

    // ── שלב 2: שליפת נתוני חייבים ────────────────────────────────────────
    await base44.asServiceRole.entities.ImportRun.update(logId, { stage: 'FETCH_DATA' });
    console.log('[Import] שלב 2: שליפת נתוני חייבים...');

    const debtResp = await fetch(
      `${API_BASE}/api/v1/managers/debts/per_building/${BUILDING_ID}?excludeCurrentMonth=false`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!debtResp.ok) {
      throw new Error(`שליפת נתוני חוב נכשלה: ${debtResp.status}`);
    }

    const debtJson = await debtResp.json();
    console.log('[Import] ✓ נתונים התקבלו, מבנה:', Object.keys(debtJson).join(', '));

    // ── שלב 3: חילוץ רשימת הדירות ───────────────────────────────────────
    await base44.asServiceRole.entities.ImportRun.update(logId, { stage: 'PARSE' });

    // Bllink מחזיר לרוב: { data: [...] } או { apartments: [...] } או מערך ישיר
    let rows = [];
    if (Array.isArray(debtJson)) {
      rows = debtJson;
    } else if (Array.isArray(debtJson?.data)) {
      rows = debtJson.data;
    } else if (Array.isArray(debtJson?.apartments)) {
      rows = debtJson.apartments;
    } else if (Array.isArray(debtJson?.debts)) {
      rows = debtJson.debts;
    } else if (Array.isArray(debtJson?.results)) {
      rows = debtJson.results;
    } else {
      // לוג את המבנה המלא לדיאגנוסטיקה
      throw new Error(`מבנה תשובת API לא מזוהה. מפתחות: ${Object.keys(debtJson).join(', ')}. תחילת תשובה: ${JSON.stringify(debtJson).slice(0, 500)}`);
    }

    console.log(`[Import] נמצאו ${rows.length} שורות`);
    logData.totalRowsRead = rows.length;

    if (rows.length === 0) {
      throw new Error('API החזיר 0 שורות — אין מה לייבא');
    }

    // ── שלב 4: deduplication בתוך הקובץ (כפל דירות) ────────────────────
    // כלל: שומרים את הרשומה האחרונה לכל דירה (last wins)
    const aptMap = new Map();
    for (const row of rows) {
      const aptRaw = row.apartmentNumber ?? row.apartment_number ?? row.apt ?? row.unit ?? row.unitNumber ?? row.unit_number;
      if (!aptRaw && aptRaw !== 0) continue;
      const apt = normalizeApt(aptRaw);
      if (apt) aptMap.set(apt, row);
    }

    const uniqueApts = Array.from(aptMap.entries());
    logData.uniqueApartments = uniqueApts.length;
    logData.skippedRowsCount = rows.length - uniqueApts.length;
    console.log(`[Import] דירות ייחודיות: ${uniqueApts.length} (כפולות שדולגו: ${logData.skippedRowsCount})`);

    // ── שלב 5: טעינת רשומות קיימות ───────────────────────────────────────
    await base44.asServiceRole.entities.ImportRun.update(logId, { stage: 'UPSERT' });
    const existingRecords = await base44.asServiceRole.entities.DebtorRecord.list('-updated_date', 2000);
    const existingMap = new Map();
    for (const rec of existingRecords) {
      if (rec.apartmentNumber) existingMap.set(normalizeApt(rec.apartmentNumber), rec);
    }
    console.log(`[Import] רשומות קיימות: ${existingMap.size}`);

    // ── שלב 6: upsert ────────────────────────────────────────────────────
    let created = 0, updated = 0, failed = 0;
    const errorDetails = [];
    const now = new Date().toISOString();
    const runId = logData.importRunId;

    for (const [apt, rowData] of uniqueApts) {
      try {
        const mapped = mapBllinkRowToDebtor(apt, rowData);
        mapped.importedThisRun = true;
        mapped.lastImportRunId = runId;
        mapped.lastImportAt = now;
        mapped.flaggedAsCleared = false;

        // חישוב debt_status_auto
        const totalDebt = mapped.totalDebt ?? 0;
        if (totalDebt <= 0) mapped.debt_status_auto = 'תקין';
        else if (totalDebt < 3000) mapped.debt_status_auto = 'לגבייה מיידית';
        else mapped.debt_status_auto = 'חריגה מופרזת';

        const existing = existingMap.get(apt);
        if (existing) {
          // עדכון — רק שדות עם ערכים לא ריקים
          const updatePayload = {};
          for (const [k, v] of Object.entries(mapped)) {
            if (v !== null && v !== undefined && v !== '') updatePayload[k] = v;
          }
          await base44.asServiceRole.entities.DebtorRecord.update(existing.id, updatePayload);
          updated++;
        } else {
          await base44.asServiceRole.entities.DebtorRecord.create(mapped);
          created++;
        }
      } catch (rowErr) {
        failed++;
        errorDetails.push({ apartmentNumber: apt, errorMessage: rowErr.message });
        console.warn(`[Import] שגיאה בדירה ${apt}:`, rowErr.message);
      }
    }

    // ── שלב 7: סיום ועדכון לוג ───────────────────────────────────────────
    const finishedAt = new Date().toISOString();
    const finalLog = {
      finishedAt,
      status: failed > 0 && (created + updated) === 0 ? 'FAILED' : failed > 0 ? 'PARTIAL' : 'SUCCESS',
      stage: 'COMPLETE',
      totalRowsRead: rows.length,
      uniqueApartments: uniqueApts.length,
      successRowsCount: created + updated,
      createdCount: created,
      updatedCount: updated,
      failedRowsCount: failed,
      skippedRowsCount: logData.skippedRowsCount,
      importMode: 'fill_missing',
      errorSummary: failed > 0 ? `${failed} שורות נכשלו` : '',
      errorDetails: errorDetails.slice(0, 20),
      qaValidation: true,
    };
    await base44.asServiceRole.entities.ImportRun.update(logId, finalLog);

    // ── שלב 8: התראה לאדמינים ────────────────────────────────────────────
    if (finalLog.status === 'SUCCESS' || finalLog.status === 'PARTIAL') {
      await notifyAdmins(base44,
        'דוח חייבים עודכן',
        `יובא בהצלחה דוח חייבים חדש. נוצרו ${created} ועודכנו ${updated} רשומות.${failed > 0 ? ` (${failed} שגיאות)` : ''}`,
        failed > 0 ? 'high' : 'normal'
      );
    } else {
      await notifyAdmins(base44,
        'יבוא דוח חייבים נכשל',
        'יבוא אוטומטי נכשל. בדוק לוג יבוא.',
        'urgent'
      );
    }

    return Response.json({
      ok: true,
      status: finalLog.status,
      logId,
      summary: {
        totalRows: rows.length,
        uniqueApartments: uniqueApts.length,
        created,
        updated,
        failed,
        skipped: logData.skippedRowsCount,
      },
      errors: errorDetails.slice(0, 5),
    });

  } catch (err) {
    console.error('[Import] שגיאה כללית:', err.message);

    if (logId) {
      await base44.asServiceRole.entities.ImportRun.update(logId, {
        finishedAt: new Date().toISOString(),
        status: 'FAILED',
        stage: 'ERROR',
        errorSummary: err.message,
      }).catch(() => {});
    }

    await notifyAdmins(base44,
      'יבוא דוח חייבים נכשל',
      `יבוא אוטומטי נכשל: ${err.message}`,
      'urgent'
    ).catch(() => {});

    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
});