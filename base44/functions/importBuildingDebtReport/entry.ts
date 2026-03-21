import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { SRPClient, calculateSignature, getNowString } from 'npm:amazon-cognito-srp-client@2.0.2';

// ─── AWS Cognito ─────────────────────────────────────────────────────────────
const COGNITO_CLIENT_ID = '66iqqmjj6s81d6qu0pvqc4226l';
const COGNITO_REGION = 'us-east-1';
const COGNITO_POOL_ID = 'us-east-1_K0OcMyw20';
const COGNITO_URL = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/`;

async function cognitoPost(target, body) {
  const r = await fetch(COGNITO_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${target}`,
    },
    body: JSON.stringify(body),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`Cognito ${target} נכשל: ${r.status} ${txt.slice(0,300)}`);
  return JSON.parse(txt);
}

async function srpAuth(username, password) {
  const srp = new SRPClient(COGNITO_POOL_ID);
  const SRP_A = srp.getA();

  console.log('[SRP] InitiateAuth...');
  const init = await cognitoPost('InitiateAuth', {
    AuthFlow: 'USER_SRP_AUTH',
    ClientId: COGNITO_CLIENT_ID,
    AuthParameters: { USERNAME: username, SRP_A },
    ClientMetadata: {},
  });

  if (init.ChallengeName !== 'PASSWORD_VERIFIER') {
    throw new Error(`Challenge לא צפוי: ${init.ChallengeName} — ${JSON.stringify(init).slice(0,300)}`);
  }

  const { SRP_B, SALT, SECRET_BLOCK, USER_ID_FOR_SRP } = init.ChallengeParameters;
  console.log(`[SRP] USER_ID_FOR_SRP=${USER_ID_FOR_SRP}`);

  const dateNow = getNowString();
  const signature = calculateSignature({
    userPoolId: COGNITO_POOL_ID,
    username: USER_ID_FOR_SRP,
    password,
    srpB: SRP_B,
    salt: SALT,
    secretBlock: SECRET_BLOCK,
    dateNow,
    srpA: SRP_A,
    srpSmallA: srp.a,
  });

  console.log('[SRP] RespondToAuthChallenge...');
  const respond = await cognitoPost('RespondToAuthChallenge', {
    ChallengeName: 'PASSWORD_VERIFIER',
    ClientId: COGNITO_CLIENT_ID,
    ChallengeResponses: {
      USERNAME: USER_ID_FOR_SRP,
      PASSWORD_CLAIM_SECRET_BLOCK: SECRET_BLOCK,
      TIMESTAMP: dateNow,
      PASSWORD_CLAIM_SIGNATURE: signature,
    },
    ClientMetadata: {},
  });

  if (respond.ChallengeName === 'DEVICE_SRP_AUTH' || respond.ChallengeName === 'DEVICE_PASSWORD_VERIFIER') {
    throw new Error(`נדרש אימות מכשיר (${respond.ChallengeName}).`);
  }

  const token = respond?.AuthenticationResult?.AccessToken;
  if (!token) throw new Error(`לא התקבל AccessToken: ${JSON.stringify(respond).slice(0,300)}`);
  return token;
}

// ─── עזרים ─────────────────────────────────────────────────────────────────
function normalizeApt(raw) {
  if (raw === null || raw === undefined) return null;
  return String(raw).trim().replace(/^0+/, '') || String(raw).trim();
}

function parseNum(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = parseFloat(String(val).replace(/[₪,\s]/g, '').trim());
  return isNaN(n) ? null : n;
}

function mapBllinkRowToDebtor(apt, data) {
  const result = { apartmentNumber: apt };
  if (data.ownerName) result.ownerName = String(data.ownerName).trim();
  if (data.owner_name) result.ownerName = String(data.owner_name).trim();
  if (data.firstName || data.lastName) {
    const n = [data.firstName, data.lastName].filter(Boolean).join(' ').trim();
    if (n) result.ownerName = n;
  }
  const ownerPhone = data.ownerPhone || data.owner_phone || data.phone || data.phoneNumber;
  if (ownerPhone) result.phoneOwner = String(ownerPhone).trim();
  const tenantPhone = data.tenantPhone || data.tenant_phone;
  if (tenantPhone) result.phoneTenant = String(tenantPhone).trim();
  const total = parseNum(data.totalDebt ?? data.total_debt ?? data.debt ?? data.debtAmount);
  if (total !== null) result.totalDebt = total;
  const monthly = parseNum(data.monthlyDebt ?? data.monthly_debt ?? data.managementFee ?? data.management_fee);
  if (monthly !== null) result.monthlyDebt = monthly;
  const special = parseNum(data.specialDebt ?? data.special_debt ?? data.extraDebt);
  if (special !== null) result.specialDebt = special;
  const months = parseNum(data.monthsInArrears ?? data.months_in_arrears ?? data.arrearsMonths);
  if (months !== null) result.monthsInArrears = months;
  if (data.detailsMonthly || data.details_monthly) result.detailsMonthly = String(data.detailsMonthly || data.details_monthly).trim();
  if (data.detailsSpecial || data.details_special) result.detailsSpecial = String(data.detailsSpecial || data.details_special).trim();
  if (data.managementMonthsRaw || data.management_months_raw) result.managementMonthsRaw = String(data.managementMonthsRaw || data.management_months_raw).trim();
  const notes = data.notes || data.comment || data.comments;
  if (notes) result.notes = String(notes).trim();
  return result;
}

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
    console.warn('[notify] שגיאה:', e.message);
  }
}

// ─── Handler ────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const startedAt = new Date().toISOString();
  const base44 = createClientFromRequest(req);

  let body = {};
  try { body = await req.json(); } catch {}

  const BLLINK_USERNAME = Deno.env.get('BLLINK_USERNAME')?.trim();
  const BLLINK_PASSWORD = Deno.env.get('BLLINK_PASSWORD')?.trim();
  const BUILDING_ID = 'udnp';
  const API_BASE = 'https://api.bllink.co';

  if (!BLLINK_USERNAME || !BLLINK_PASSWORD) {
    return Response.json({ error: 'BLLINK_USERNAME / BLLINK_PASSWORD חסרים' }, { status: 500 });
  }

  let logId = null;
  const logData = {
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
    const logRecord = await base44.asServiceRole.entities.ImportRun.create(logData);
    logId = logRecord.id;

    console.log(`[Import] שלב 1: התחברות user="${BLLINK_USERNAME}"`);
    const token = await srpAuth(BLLINK_USERNAME, BLLINK_PASSWORD);
    console.log('[Import] ✓ AccessToken התקבל');

    await base44.asServiceRole.entities.ImportRun.update(logId, { stage: 'FETCH_DATA' });

    const debtResp = await fetch(
      `${API_BASE}/api/v1/managers/debts/per_building/${BUILDING_ID}?excludeCurrentMonth=false`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!debtResp.ok) {
      const txt = await debtResp.text();
      throw new Error(`שליפת נתוני חוב נכשלה: ${debtResp.status} ${txt.slice(0,200)}`);
    }

    const debtJson = await debtResp.json();
    console.log('[Import] מבנה תשובה:', Object.keys(debtJson).join(', '));

    let rows = [];
    if (Array.isArray(debtJson)) rows = debtJson;
    else if (Array.isArray(debtJson?.data)) rows = debtJson.data;
    else if (Array.isArray(debtJson?.apartments)) rows = debtJson.apartments;
    else if (Array.isArray(debtJson?.debts)) rows = debtJson.debts;
    else if (Array.isArray(debtJson?.results)) rows = debtJson.results;
    else throw new Error(`מבנה תשובה לא מזוהה. מפתחות: ${Object.keys(debtJson).join(', ')}. ${JSON.stringify(debtJson).slice(0, 400)}`);

    console.log(`[Import] ${rows.length} שורות`);
    if (rows.length === 0) throw new Error('API החזיר 0 שורות');

    await base44.asServiceRole.entities.ImportRun.update(logId, { stage: 'PARSE', totalRowsRead: rows.length });

    const aptMap = new Map();
    for (const row of rows) {
      const aptRaw = row.apartmentNumber ?? row.apartment_number ?? row.apt ?? row.unit ?? row.unitNumber;
      if (!aptRaw && aptRaw !== 0) continue;
      const apt = normalizeApt(aptRaw);
      if (apt) aptMap.set(apt, row);
    }

    const uniqueApts = Array.from(aptMap.entries());
    logData.uniqueApartments = uniqueApts.length;
    logData.skippedRowsCount = rows.length - uniqueApts.length;

    await base44.asServiceRole.entities.ImportRun.update(logId, { stage: 'UPSERT' });
    const existingRecords = await base44.asServiceRole.entities.DebtorRecord.list('-updated_date', 2000);
    const existingMap = new Map();
    for (const rec of existingRecords) {
      if (rec.apartmentNumber) existingMap.set(normalizeApt(rec.apartmentNumber), rec);
    }

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
        const totalDebt = mapped.totalDebt ?? 0;
        if (totalDebt <= 0) mapped.debt_status_auto = 'תקין';
        else if (totalDebt < 3000) mapped.debt_status_auto = 'לגבייה מיידית';
        else mapped.debt_status_auto = 'חריגה מופרזת';

        const existing = existingMap.get(apt);
        if (existing) {
          const updatePayload = {};
          for (const [k2, v] of Object.entries(mapped)) {
            if (v !== null && v !== undefined && v !== '') updatePayload[k2] = v;
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
      }
    }

    const finalLog = {
      finishedAt: new Date().toISOString(),
      status: failed > 0 && (created + updated) === 0 ? 'FAILED' : failed > 0 ? 'PARTIAL' : 'SUCCESS',
      stage: 'COMPLETE',
      totalRowsRead: rows.length,
      uniqueApartments: uniqueApts.length,
      successRowsCount: created + updated,
      createdCount: created,
      updatedCount: updated,
      failedRowsCount: failed,
      skippedRowsCount: logData.skippedRowsCount,
      errorSummary: failed > 0 ? `${failed} שורות נכשלו` : '',
      errorDetails: errorDetails.slice(0, 20),
      qaValidation: true,
    };
    await base44.asServiceRole.entities.ImportRun.update(logId, finalLog);

    if (finalLog.status !== 'FAILED') {
      await notifyAdmins(base44, 'דוח חייבים עודכן',
        `יובא בהצלחה. נוצרו ${created}, עודכנו ${updated}.${failed > 0 ? ` (${failed} שגיאות)` : ''}`,
        failed > 0 ? 'high' : 'normal');
    } else {
      await notifyAdmins(base44, 'יבוא נכשל', 'יבוא אוטומטי נכשל. בדוק לוג.', 'urgent');
    }

    return Response.json({ ok: true, status: finalLog.status, logId, summary: { totalRows: rows.length, created, updated, failed } });

  } catch (err) {
    console.error('[Import] שגיאה:', err.message);
    if (logId) {
      await base44.asServiceRole.entities.ImportRun.update(logId, {
        finishedAt: new Date().toISOString(), status: 'FAILED', stage: 'ERROR', errorSummary: err.message,
      }).catch(() => {});
    }
    await notifyAdmins(base44, 'יבוא נכשל', `שגיאה: ${err.message}`, 'urgent').catch(() => {});
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
});