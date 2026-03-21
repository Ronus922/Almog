import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { createHmac, createHash } from 'node:crypto';
import bigInt from 'npm:big-integer@1.6.52';
const BigInteger = (n, base) => base ? bigInt(n, base) : bigInt(n);
BigInteger.zero = bigInt.zero;

// ─── AWS Cognito SRP Authentication ───────────────────────────────────────────
const COGNITO_POOL_ID = 'us-east-1_K0OcMyw20';
const COGNITO_CLIENT_ID = '66iqqmjj6s81d6qu0pvqc4226l';
const COGNITO_REGION = 'us-east-1';
const COGNITO_URL = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/`;

// N: 3072-bit prime for SRP
const N_HEX = 'FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6BF12FFA06D98A0864D87602733EC86A64521F2B18177B200CBBE117577A615D6C770988C0BAD946E208E24FA074E5AB3143DB5BFCE0FD108E4B82D120A93AD2CAFFFFFFFFFFFFFFFF';
const G_HEX = '2';

function hexToUint8(hex) {
  const even = hex.length % 2 ? '0' + hex : hex;
  const arr = new Uint8Array(even.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(even.substr(i * 2, 2), 16);
  return arr;
}

function uint8ToHex(arr) {
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function padHex(bigInt) {
  let hex = bigInt.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  if (hex[0] >= '8') hex = '00' + hex;
  return hex;
}

function sha256hex(data) {
  // data: Uint8Array or string
  const input = typeof data === 'string'
    ? new TextEncoder().encode(data)
    : data;
  return createHash('sha256').update(input).digest('hex');
}

function sha256hexFromHex(hexStr) {
  return createHash('sha256').update(hexToUint8(hexStr)).digest('hex');
}

function hmacSha256(keyBytes, data) {
  const mac = createHmac('sha256', keyBytes);
  mac.update(data);
  return mac.digest();
}

function computeK() {
  const nHex = N_HEX.length % 2 ? '0' + N_HEX : N_HEX;
  const gHex = G_HEX.padStart(nHex.length, '0');
  const combined = new Uint8Array(nHex.length / 2 + gHex.length / 2);
  combined.set(hexToUint8(nHex), 0);
  combined.set(hexToUint8(gHex), nHex.length / 2);
  return BigInteger(createHash('sha256').update(combined).digest('hex'), 16);
}

function computeU(A_hex, B_hex) {
  const pA = A_hex.length % 2 ? '0' + A_hex : A_hex;
  const pB = B_hex.length % 2 ? '0' + B_hex : B_hex;
  const combined = new Uint8Array(pA.length / 2 + pB.length / 2);
  combined.set(hexToUint8(pA), 0);
  combined.set(hexToUint8(pB), pA.length / 2);
  return BigInteger(createHash('sha256').update(combined).digest('hex'), 16);
}

function hkdfSha256(ikm, salt, info, length = 16) {
  // HKDF Extract
  const prk = hmacSha256(salt, ikm);
  // HKDF Expand
  const infoBytes = typeof info === 'string' ? new TextEncoder().encode(info) : info;
  const T = hmacSha256(prk, new Uint8Array([...infoBytes, 1]));
  return T.slice(0, length);
}

// base64 decode without Buffer
function base64ToUint8(b64) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function uint8ToBase64(arr) {
  return btoa(String.fromCharCode(...arr));
}

async function srpAuth(username, password) {
  const N = BigInteger(N_HEX, 16);
  const g = BigInteger(G_HEX, 16);
  const k = computeK();

  // Generate random a (1024-bit)
  const aBytes = crypto.getRandomValues(new Uint8Array(128));
  const a = BigInteger(uint8ToHex(aBytes), 16);
  const A = g.modPow(a, N);
  const A_hex = padHex(A);

  console.log('[SRP] Step 1: InitiateAuth...');

  const initResp = await fetch(COGNITO_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
    },
    body: JSON.stringify({
      AuthFlow: 'USER_SRP_AUTH',
      ClientId: COGNITO_CLIENT_ID,
      AuthParameters: { USERNAME: username, SRP_A: A_hex },
      ClientMetadata: {},
    }),
  });

  if (!initResp.ok) {
    const err = await initResp.text();
    throw new Error(`Cognito InitiateAuth נכשל: ${initResp.status} ${err.slice(0, 200)}`);
  }

  const initJson = await initResp.json();
  const { ChallengeName, ChallengeParameters } = initJson;

  if (ChallengeName !== 'PASSWORD_VERIFIER') {
    throw new Error(`Cognito challenge לא צפוי: ${ChallengeName}. תשובה: ${JSON.stringify(initJson).slice(0, 300)}`);
  }

  console.log('[SRP] Step 2: PASSWORD_VERIFIER...');

  const { SRP_B, SALT, SECRET_BLOCK, USER_ID_FOR_SRP } = ChallengeParameters;
  const B = BigInteger(SRP_B, 16);

  if (B.mod(N).equals(BigInteger.zero)) throw new Error('Cognito: B mod N == 0');

  // u = H(A || B)
  const u = computeU(A_hex, padHex(B));
  const uBig = BigInteger(u, 16);

  // x = H(SALT || H(poolName || ":" || username || ":" || password))
  // Cognito uses: poolName + ":" + username + ":" + password (with colons)
  const userPoolName = COGNITO_POOL_ID.split('_')[1];
  const credHash = sha256hex(`${userPoolName}:${username}:${password}`);
  const saltEven = SALT.length % 2 ? '0' + SALT : SALT;
  const saltedInput = new Uint8Array(saltEven.length / 2 + credHash.length / 2);
  saltedInput.set(hexToUint8(saltEven), 0);
  saltedInput.set(hexToUint8(credHash), saltEven.length / 2);
  const x = BigInteger(createHash('sha256').update(saltedInput).digest('hex'), 16);

  // S = (B - k * g^x) ^ (a + u * x) mod N
  const gX = g.modPow(x, N);
  let base = B.subtract(k.multiply(gX)).mod(N);
  if (base.isNegative()) base = base.add(N);
  const exp = a.add(uBig.multiply(x));
  const S = base.modPow(exp, N);
  const S_hex = padHex(S);

  // HKDF to get session key
  // salt = H(pad(A) || pad(B)) — same as u computation
  const AB_combined = new Uint8Array([
    ...hexToUint8(A_hex.length % 2 ? '0' + A_hex : A_hex),
    ...hexToUint8(padHex(B)),
  ]);
  const uHashBytes = createHash('sha256').update(AB_combined).digest();
  const hkdfKey = hkdfSha256(hexToUint8(S_hex), uHashBytes, 'Caldera Derived Key');

  // Timestamp (Cognito format)
  const now = new Date();
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateStr = `${DAYS[now.getUTCDay()]} ${MONTHS[now.getUTCMonth()]} ${String(now.getUTCDate()).padStart(2, ' ')} ${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')} UTC ${now.getUTCFullYear()}`;

  // Signature = HMAC-SHA256(hkdfKey, poolName || userID || secretBlock || timestamp)
  const poolNameBytes = new TextEncoder().encode(userPoolName);
  const userIdBytes = new TextEncoder().encode(USER_ID_FOR_SRP);
  const secretBlockBytes = base64ToUint8(SECRET_BLOCK);
  const dateBytes = new TextEncoder().encode(dateStr);

  const msgBytes = new Uint8Array([
    ...poolNameBytes,
    ...userIdBytes,
    ...secretBlockBytes,
    ...dateBytes,
  ]);
  const sigBytes = hmacSha256(hkdfKey, msgBytes);
  const signature = uint8ToBase64(sigBytes);

  const respondResp = await fetch(COGNITO_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.RespondToAuthChallenge',
    },
    body: JSON.stringify({
      ChallengeName: 'PASSWORD_VERIFIER',
      ClientId: COGNITO_CLIENT_ID,
      ChallengeResponses: {
        USERNAME: USER_ID_FOR_SRP,
        PASSWORD_CLAIM_SECRET_BLOCK: SECRET_BLOCK,
        TIMESTAMP: dateStr,
        PASSWORD_CLAIM_SIGNATURE: signature,
      },
      ClientMetadata: {},
    }),
  });

  if (!respondResp.ok) {
    const err = await respondResp.text();
    throw new Error(`Cognito RespondToChallenge נכשל: ${respondResp.status} ${err.slice(0, 200)}`);
  }

  const respondJson = await respondResp.json();
  console.log('[SRP] Cognito respond result:', respondJson.ChallengeName || 'AuthenticationResult received');

  // Handle DEVICE_SRP_AUTH or DEVICE_PASSWORD_VERIFIER
  if (respondJson.ChallengeName === 'DEVICE_SRP_AUTH' || respondJson.ChallengeName === 'DEVICE_PASSWORD_VERIFIER') {
    throw new Error(`Cognito דורש אימות מכשיר (${respondJson.ChallengeName}). יש לכבות "זכור מכשיר" בהגדרות Cognito User Pool, או להשתמש ב-ACCESS_TOKEN ישירות.`);
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

    // ── שלב 1: התחברות ל-Bllink דרך AWS Cognito SRP ──────────────────────
    console.log('[Import] שלב 1: התחברות ל-Bllink דרך Cognito SRP...');
    const token = await srpAuth(BLLINK_USERNAME, BLLINK_PASSWORD);
    console.log('[Import] ✓ התחברות הצליחה, AccessToken התקבל');

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