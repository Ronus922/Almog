import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { createHmac, createHash } from 'node:crypto';
import { BigInteger } from 'npm:big-integer@1.6.52';

// ─── AWS Cognito SRP Authentication ───────────────────────────────────────────
const COGNITO_POOL_ID = 'us-east-1_K0OcMyw20';
const COGNITO_CLIENT_ID = '66iqqmjj6s81d6qu0pvqc4226l';
const COGNITO_REGION = 'us-east-1';
const COGNITO_URL = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/`;

// N: 3072-bit prime for SRP
const N_HEX = 'FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6BF12FFA06D98A0864D87602733EC86A64521F2B18177B200CBBE117577A615D6C770988C0BAD946E208E24FA074E5AB3143DB5BFCE0FD108E4B82D120A93AD2CAFFFFFFFFFFFFFFFF';
const G_HEX = '2';

function hexToBytes(hex) {
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.substr(i, 2), 16));
  return new Uint8Array(bytes);
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function padHex(bigInt) {
  let hex = bigInt.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  if (hex[0] >= '8') hex = '00' + hex;
  return hex;
}

function hexHash(hexStr) {
  return createHash('sha256').update(Buffer.from(hexStr, 'hex')).digest('hex');
}

function computeH(uHex, nHex) {
  const combined = hexStr1 => {
    const a = hexStr1.length % 2 ? '0' + hexStr1 : hexStr1;
    return a;
  };
  const buf = Buffer.concat([
    Buffer.from(combined(uHex), 'hex'),
    Buffer.from(combined(nHex), 'hex')
  ]);
  return createHash('sha256').update(buf).digest('hex');
}

function computeK() {
  const nHex = N_HEX.length % 2 ? '0' + N_HEX : N_HEX;
  const gHex = G_HEX.padStart(nHex.length, '0');
  const buf = Buffer.concat([Buffer.from(nHex, 'hex'), Buffer.from(gHex, 'hex')]);
  return BigInteger(createHash('sha256').update(buf).digest('hex'), 16);
}

async function srpAuth(username, password) {
  const N = BigInteger(N_HEX, 16);
  const g = BigInteger(G_HEX, 16);
  const k = computeK();

  // Generate random a
  const aBytes = crypto.getRandomValues(new Uint8Array(128));
  const a = BigInteger(bytesToHex(aBytes), 16);
  const A = g.modPow(a, N);
  const A_hex = padHex(A);

  // Step 1: InitiateAuth
  const initiateBody = {
    AuthFlow: 'USER_SRP_AUTH',
    ClientId: COGNITO_CLIENT_ID,
    AuthParameters: {
      USERNAME: username,
      SRP_A: A_hex,
    },
    ClientMetadata: {},
  };

  const initResp = await fetch(COGNITO_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
    },
    body: JSON.stringify(initiateBody),
  });

  if (!initResp.ok) {
    const err = await initResp.text();
    throw new Error(`Cognito InitiateAuth נכשל: ${initResp.status} ${err.slice(0, 200)}`);
  }

  const initJson = await initResp.json();
  const { ChallengeName, ChallengeParameters, Session } = initJson;

  if (ChallengeName !== 'PASSWORD_VERIFIER') {
    throw new Error(`Cognito challenge לא צפוי: ${ChallengeName}`);
  }

  const { SRP_B, SALT, SECRET_BLOCK, USER_ID_FOR_SRP } = ChallengeParameters;
  const B = BigInteger(SRP_B, 16);

  if (B.mod(N).equals(BigInteger.zero)) throw new Error('Cognito: B mod N == 0');

  // u = H(A, B)
  const u = BigInteger(computeH(A_hex, padHex(B)), 16);

  // x = H(salt | H(poolName | ':' | username | ':' | password))
  const userPoolName = COGNITO_POOL_ID.split('_')[1];
  const innerHash = createHash('sha256').update(`${userPoolName}${username}:${password}`).digest('hex');
  const saltedHex = (SALT.length % 2 ? '0' + SALT : SALT) + innerHash;
  const x = BigInteger(createHash('sha256').update(Buffer.from(saltedHex, 'hex')).digest('hex'), 16);

  // S = (B - k * g^x)^(a + u*x) mod N
  const gX = g.modPow(x, N);
  let bMinuskgX = B.subtract(k.multiply(gX)).mod(N);
  if (bMinuskgX.isNegative()) bMinuskgX = bMinuskgX.add(N);
  const S = bMinuskgX.modPow(a.add(u.multiply(x)), N);
  const S_hex = padHex(S);

  // HKDF
  function hkdf(ikm, salt, info, len = 16) {
    const prk = createHmac('sha256', salt).update(ikm).digest();
    const infoBuf = Buffer.concat([Buffer.from(info), Buffer.from([1])]);
    return createHmac('sha256', prk).update(infoBuf).digest().slice(0, len);
  }

  const S_bytes = Buffer.from(S_hex, 'hex');
  const salt_hkdf = Buffer.from(createHash('sha256').update(Buffer.from(padHex(BigInteger(hexHash(A_hex + padHex(B)), 16)), 'hex')).digest('hex'), 'hex');
  const hkdfKey = hkdf(S_bytes, Buffer.from('Caldera Derived Key'), 'Caldera Derived Key');

  // Timestamp
  const now = new Date();
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateStr = `${DAYS[now.getUTCDay()]} ${MONTHS[now.getUTCMonth()]} ${String(now.getUTCDate()).padStart(2,' ')} ${String(now.getUTCHours()).padStart(2,'0')}:${String(now.getUTCMinutes()).padStart(2,'0')}:${String(now.getUTCSeconds()).padStart(2,'0')} UTC ${now.getUTCFullYear()}`;

  // Signature
  const msg = Buffer.concat([
    Buffer.from(userPoolName, 'utf8'),
    Buffer.from(USER_ID_FOR_SRP, 'utf8'),
    Buffer.from(SECRET_BLOCK, 'base64'),
    Buffer.from(dateStr, 'utf8'),
  ]);
  const signature = createHmac('sha256', hkdfKey).update(msg).digest('base64');

  // Step 2: RespondToAuthChallenge
  const respondBody = {
    ChallengeName: 'PASSWORD_VERIFIER',
    ClientId: COGNITO_CLIENT_ID,
    ChallengeResponses: {
      USERNAME: USER_ID_FOR_SRP,
      PASSWORD_CLAIM_SECRET_BLOCK: SECRET_BLOCK,
      TIMESTAMP: dateStr,
      PASSWORD_CLAIM_SIGNATURE: signature,
    },
    ClientMetadata: {},
  };

  const respondResp = await fetch(COGNITO_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.RespondToAuthChallenge',
    },
    body: JSON.stringify(respondBody),
  });

  if (!respondResp.ok) {
    const err = await respondResp.text();
    throw new Error(`Cognito RespondToChallenge נכשל: ${respondResp.status} ${err.slice(0, 200)}`);
  }

  const respondJson = await respondResp.json();

  // If DEVICE_SRP_AUTH challenge - skip device verification, return what we have
  if (respondJson.ChallengeName === 'DEVICE_SRP_AUTH' || respondJson.ChallengeName === 'DEVICE_PASSWORD_VERIFIER') {
    // Device not remembered - we can't complete this challenge without device keys
    throw new Error('Cognito DEVICE_SRP_AUTH נדרש — המכשיר לא זכור. פרטים נוספים: יש להיכנס פעם ראשונה מהדפדפן ולבטל "זכור מכשיר".');
  }

  const accessToken = respondJson?.AuthenticationResult?.AccessToken;
  if (!accessToken) {
    throw new Error(`Cognito לא החזיר AccessToken. תשובה: ${JSON.stringify(respondJson).slice(0, 300)}`);
  }

  return accessToken;
}

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