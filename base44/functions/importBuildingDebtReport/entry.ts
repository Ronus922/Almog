import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * אימות Cognito SRP — מימוש נאמן לחלוטין ל-amazon-cognito-identity-js
 * מקור: https://github.com/aws-amplify/amplify-js/blob/main/packages/amazon-cognito-identity-js/src/AuthenticationHelper.js
 */

const COGNITO_CLIENT_ID = '66iqqmjj6s81d6qu0pvqc4226l';
const COGNITO_REGION    = 'us-east-1';
const COGNITO_POOL_ID   = 'us-east-1_K0OcMyw20';
const POOL_NAME         = COGNITO_POOL_ID.split('_')[1]; // "K0OcMyw20"
const COGNITO_URL       = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/`;

// ── BigInt polyfill via pure JS ───────────────────────────────────────────────
// משתמש ב-native BigInt של JavaScript (ES2020) — זמין ב-Deno
// N, g, k — מחושבים כ-native BigInt

const N_HEX =
  'FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD1' +
  '29024E088A67CC74020BBEA63B139B22514A08798E3404DD' +
  'EF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245' +
  'E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7ED' +
  'EE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3D' +
  'C2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F' +
  '83655D23DCA3AD961C62F356208552BB9ED529077096966D' +
  '670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B' +
  'E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9' +
  'DE2BCBF6955817183995497CEA956AE515D2261898FA0510' +
  '15728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64' +
  'ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7' +
  'ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6B' +
  'F12FFA06D98A0864D87602733EC86A64521F2B18177B200C' +
  'BBE117577A615D6C770988C0BAD946E208E24FA074E5AB31' +
  '43DB5BFCE0FD108E4B82D120A93AD2CAFFFFFFFFFFFFFFFF';

const N = BigInt('0x' + N_HEX);
const g = BigInt(2);

// ── crypto helpers ─────────────────────────────────────────────────────────

async function sha256(data) {
  const buf = await crypto.subtle.digest('SHA-256', data instanceof Uint8Array ? data : new TextEncoder().encode(data));
  return new Uint8Array(buf);
}

async function hmacSha256(keyBytes, data) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, data instanceof Uint8Array ? data : new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

function hexToBytes(hex) {
  const h = hex.length % 2 ? '0' + hex : hex;
  const b = new Uint8Array(h.length / 2);
  for (let i = 0; i < b.length; i++) b[i] = parseInt(h.substr(i * 2, 2), 16);
  return b;
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function concat(...arrays) {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const b = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
  return b;
}

function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

/**
 * padHex — בדיוק כמו ב-amazon-cognito-identity-js
 * מוסיף 00 אם הביט הגבוה >= 0x80
 */
function padHex(bignum) {
  let hex = bignum.toString(16);
  if (hex.length % 2 !== 0) hex = '0' + hex;
  if ('89abcdef'.includes(hex[0])) hex = '00' + hex;
  return hex;
}

function modPow(base, exp, mod) {
  let result = BigInt(1);
  base = base % mod;
  while (exp > BigInt(0)) {
    if (exp % BigInt(2) === BigInt(1)) result = (result * base) % mod;
    exp = exp / BigInt(2);
    base = (base * base) % mod;
  }
  return result;
}

// ── k = H(N, g) ────────────────────────────────────────────────────────────
async function computeK() {
  const nHex = N_HEX.length % 2 ? '0' + N_HEX : N_HEX;
  const gHex = '2'.padStart(nHex.length, '0');
  const hash = await sha256(concat(hexToBytes(nHex), hexToBytes(gHex)));
  return BigInt('0x' + bytesToHex(hash));
}

// ── u = H(A, B) ─────────────────────────────────────────────────────────────
async function computeU(A_hex, B_hex) {
  const pA = A_hex.length % 2 ? '0' + A_hex : A_hex;
  const pB = B_hex.length % 2 ? '0' + B_hex : B_hex;
  const hash = await sha256(concat(hexToBytes(pA), hexToBytes(pB)));
  return BigInt('0x' + bytesToHex(hash));
}

/**
 * x = H(salt || H(poolName || username || password))
 * נאמן ל-amazon-cognito-identity-js: אין נקודותיים, concat ישיר של strings
 */
async function computeX(saltHex, username, password) {
  const inner = await sha256(new TextEncoder().encode(POOL_NAME + username + password));
  const saltBytes = hexToBytes(saltHex.length % 2 ? '0' + saltHex : saltHex);
  const hash = await sha256(concat(saltBytes, inner));
  return BigInt('0x' + bytesToHex(hash));
}

/**
 * S = (B - k * g^x) ^ (a + u*x) mod N
 */
function computeS(a, B, k, u, x) {
  let base = (B - k * modPow(g, x, N)) % N;
  if (base < BigInt(0)) base += N;
  const exp = a + u * x;
  return modPow(base, exp, N);
}

/**
 * HKDF key derivation — נאמן ל-amazon-cognito-identity-js
 * PRK = HMAC(key=H(A||B), data=S_bytes)
 * T   = HMAC(key=PRK, data="Caldera Derived Key" || 0x01)
 * return T[0:16]
 */
async function computeHkdfKey(A_hex, B_hex, S) {
  const pA = A_hex.length % 2 ? '0' + A_hex : A_hex;
  const pB = B_hex.length % 2 ? '0' + B_hex : B_hex;
  const uHash = await sha256(concat(hexToBytes(pA), hexToBytes(pB)));
  const S_bytes = hexToBytes(padHex(S));
  const prk = await hmacSha256(uHash, S_bytes);
  const info = concat(new TextEncoder().encode('Caldera Derived Key'), new Uint8Array([0x01]));
  const T = await hmacSha256(prk, info);
  return T.slice(0, 16);
}

function cognitoTimestamp() {
  const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now = new Date();
  const d = String(now.getUTCDate()).padStart(2, ' ');
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const mm = String(now.getUTCMinutes()).padStart(2, '0');
  const ss = String(now.getUTCSeconds()).padStart(2, '0');
  return `${DAYS[now.getUTCDay()]} ${MONTHS[now.getUTCMonth()]} ${d} ${hh}:${mm}:${ss} UTC ${now.getUTCFullYear()}`;
}

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
  if (!r.ok) throw new Error(`Cognito ${target} נכשל: ${r.status} ${txt.slice(0, 400)}`);
  return JSON.parse(txt);
}

async function srpAuth(username, password) {
  // ניסיון ראשון: USER_PASSWORD_AUTH (פשוט יותר, אם Pool מאפשר)
  try {
    const resp = await cognitoPost('InitiateAuth', {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: COGNITO_CLIENT_ID,
      AuthParameters: { USERNAME: username, PASSWORD: password },
      ClientMetadata: {},
    });
    const token = resp?.AuthenticationResult?.AccessToken;
    if (token) return token;
    if (resp.ChallengeName) throw new Error(`Challenge נדרש: ${resp.ChallengeName}`);
    throw new Error(`USER_PASSWORD_AUTH לא החזיר token: ${JSON.stringify(resp).slice(0, 200)}`);
  } catch (e) {
    if (!e.message.includes('NotAuthorizedException') && !e.message.includes('ALLOW_USER_PASSWORD_AUTH')) {
      throw e; // שגיאה שלא קשורה ל-flow — העבר הלאה
    }
    // fallback: USER_SRP_AUTH
  }

  const k = await computeK();
  const aBytes = crypto.getRandomValues(new Uint8Array(128));
  const a = BigInt('0x' + bytesToHex(aBytes)) % N;
  const A = modPow(g, a, N);
  const A_hex = padHex(A);

  const init = await cognitoPost('InitiateAuth', {
    AuthFlow: 'USER_SRP_AUTH',
    ClientId: COGNITO_CLIENT_ID,
    AuthParameters: { USERNAME: username, SRP_A: A_hex },
    ClientMetadata: {},
  });

  if (init.ChallengeName !== 'PASSWORD_VERIFIER') {
    throw new Error(`Challenge לא צפוי: ${init.ChallengeName}`);
  }

  const { SRP_B, SALT, SECRET_BLOCK, USER_ID_FOR_SRP } = init.ChallengeParameters;
  const B = BigInt('0x' + SRP_B);
  const B_padHex = padHex(B);

  const u = await computeU(A_hex, B_padHex);
  const x = await computeX(SALT, USER_ID_FOR_SRP, password);
  const S = computeS(a, B, k, u, x);
  const hkdfKey = await computeHkdfKey(A_hex, B_padHex, S);
  const ts = cognitoTimestamp();

  const msg = concat(
    new TextEncoder().encode(POOL_NAME),
    new TextEncoder().encode(USER_ID_FOR_SRP),
    base64ToBytes(SECRET_BLOCK),
    new TextEncoder().encode(ts)
  );
  const sigBytes = await hmacSha256(hkdfKey, msg);
  const sig = bytesToBase64(sigBytes);

  const respond = await cognitoPost('RespondToAuthChallenge', {
    ChallengeName: 'PASSWORD_VERIFIER',
    ClientId: COGNITO_CLIENT_ID,
    ChallengeResponses: {
      USERNAME: USER_ID_FOR_SRP,
      PASSWORD_CLAIM_SECRET_BLOCK: SECRET_BLOCK,
      TIMESTAMP: ts,
      PASSWORD_CLAIM_SIGNATURE: sig,
    },
    ClientMetadata: {},
  });

  if (respond.ChallengeName) throw new Error(`אתגר נוסף: ${respond.ChallengeName}`);

  const token = respond?.AuthenticationResult?.AccessToken;
  if (!token) throw new Error(`לא התקבל AccessToken: ${JSON.stringify(respond).slice(0, 300)}`);
  return token;
}

// ─── utils ──────────────────────────────────────────────────────────────────
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
  const ownerName = data.ownerName || data.owner_name ||
    ([data.firstName, data.lastName].filter(Boolean).join(' ').trim()) || null;
  if (ownerName) result.ownerName = String(ownerName).trim();
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
    // silent
  }
}

// ─── Main Handler ────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const startedAt = new Date().toISOString();
  const base44 = createClientFromRequest(req);

  const BLLINK_USERNAME = Deno.env.get('BLLINK_USERNAME')?.trim();
  const BLLINK_PASSWORD = Deno.env.get('BLLINK_PASSWORD')?.trim();
  const BUILDING_ID = 'udnp';
  const API_BASE = 'https://api.bllink.co';

  if (!BLLINK_USERNAME || !BLLINK_PASSWORD) {
    return Response.json({ error: 'BLLINK_USERNAME / BLLINK_PASSWORD חסרים' }, { status: 500 });
  }

  // DEBUG: בדיקת credentials (נמחק לאחר אימות)
  const urlParams = new URL(req.url).searchParams;
  if (urlParams.get('debug') === '1') {
    return Response.json({
      username_length: BLLINK_USERNAME.length,
      username_first3: BLLINK_USERNAME.slice(0, 3),
      username_last3: BLLINK_USERNAME.slice(-3),
      password_length: BLLINK_PASSWORD.length,
      password_first2: BLLINK_PASSWORD.slice(0, 2),
      password_last2: BLLINK_PASSWORD.slice(-2),
      pool_name: POOL_NAME,
      client_id_first8: COGNITO_CLIENT_ID.slice(0, 8),
    });
  }

  // DEBUG mode
  let body = {};
  try { body = await req.json(); } catch {}
  if (body?.debug === '1') {
    return Response.json({
      username_length: BLLINK_USERNAME.length,
      username_chars: [...BLLINK_USERNAME].map(c => c.charCodeAt(0)),
      password_length: BLLINK_PASSWORD.length,
      password_chars: [...BLLINK_PASSWORD].map(c => c.charCodeAt(0)),
      pool_name: POOL_NAME,
    });
  }

  let logId = null;
  const runId = `bllink-${Date.now()}`;

  const logData = {
    importRunId: runId,
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

    // שלב 1: אימות
    const token = await srpAuth(BLLINK_USERNAME, BLLINK_PASSWORD);

    await base44.asServiceRole.entities.ImportRun.update(logId, { stage: 'FETCH_DATA' });

    // שלב 2: שליפת נתוני חוב
    const debtResp = await fetch(
      `${API_BASE}/api/v1/managers/debts/per_building/${BUILDING_ID}?excludeCurrentMonth=false`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!debtResp.ok) {
      const txt = await debtResp.text();
      throw new Error(`שליפת נתוני חוב נכשלה: ${debtResp.status} ${txt.slice(0, 200)}`);
    }

    const debtJson = await debtResp.json();

    let rows = [];
    if (Array.isArray(debtJson)) rows = debtJson;
    else if (Array.isArray(debtJson?.data)) rows = debtJson.data;
    else if (Array.isArray(debtJson?.value)) rows = debtJson.value;
    else if (Array.isArray(debtJson?.apartments)) rows = debtJson.apartments;
    else if (Array.isArray(debtJson?.debts)) rows = debtJson.debts;
    else if (Array.isArray(debtJson?.results)) rows = debtJson.results;
    else throw new Error(`מבנה תשובה לא מזוהה: ${Object.keys(debtJson).join(', ')}. דוגמה: ${JSON.stringify(debtJson).slice(0, 500)}`);

    if (rows.length === 0) throw new Error('API החזיר 0 שורות');

    await base44.asServiceRole.entities.ImportRun.update(logId, { stage: 'PARSE', totalRowsRead: rows.length });

    // מיפוי לפי דירה
    const aptMap = new Map();
    for (const row of rows) {
      const aptRaw = row.apartmentNumber ?? row.apartment_number ?? row.apt ?? row.unit ?? row.unitNumber;
      if (aptRaw === null || aptRaw === undefined) continue;
      const apt = normalizeApt(aptRaw);
      if (apt) aptMap.set(apt, row);
    }

    const uniqueApts = Array.from(aptMap.entries());

    await base44.asServiceRole.entities.ImportRun.update(logId, {
      stage: 'UPSERT',
      uniqueApartments: uniqueApts.length,
      skippedRowsCount: rows.length - uniqueApts.length,
    });

    // טען רשומות קיימות
    const existingRecords = await base44.asServiceRole.entities.DebtorRecord.list('-updated_date', 2000);
    const existingMap = new Map();
    for (const rec of existingRecords) {
      if (rec.apartmentNumber) existingMap.set(normalizeApt(rec.apartmentNumber), rec);
    }

    let created = 0, updated = 0, failed = 0;
    const errorDetails = [];
    const now = new Date().toISOString();

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    for (let i = 0; i < uniqueApts.length; i++) {
      const [apt, rowData] = uniqueApts[i];
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

        // delay קטן כל 5 רשומות למניעת rate limit
        if ((i + 1) % 5 === 0) await sleep(300);
      } catch (rowErr) {
        if (rowErr.message?.includes('Rate limit')) {
          // המתן ונסה שוב
          await sleep(2000);
          try {
            const existing = existingMap.get(apt);
            const mapped = mapBllinkRowToDebtor(apt, rowData);
            mapped.importedThisRun = true; mapped.lastImportRunId = runId; mapped.lastImportAt = now;
            if (existing) {
              await base44.asServiceRole.entities.DebtorRecord.update(existing.id, mapped);
              updated++;
            } else {
              await base44.asServiceRole.entities.DebtorRecord.create(mapped);
              created++;
            }
          } catch (retryErr) {
            failed++;
            errorDetails.push({ apartmentNumber: apt, errorMessage: retryErr.message });
          }
        } else {
          failed++;
          errorDetails.push({ apartmentNumber: apt, errorMessage: rowErr.message });
        }
      }
    }

    const finalStatus = failed > 0 && (created + updated) === 0 ? 'FAILED' : failed > 0 ? 'PARTIAL' : 'SUCCESS';
    await base44.asServiceRole.entities.ImportRun.update(logId, {
      finishedAt: new Date().toISOString(),
      status: finalStatus,
      stage: 'COMPLETE',
      totalRowsRead: rows.length,
      uniqueApartments: uniqueApts.length,
      successRowsCount: created + updated,
      createdCount: created,
      updatedCount: updated,
      failedRowsCount: failed,
      skippedRowsCount: rows.length - uniqueApts.length,
      errorSummary: failed > 0 ? `${failed} שורות נכשלו` : '',
      errorDetails: errorDetails.slice(0, 20),
      qaValidation: true,
    });

    if (finalStatus !== 'FAILED') {
      await notifyAdmins(base44, 'דוח חייבים עודכן',
        `יובא בהצלחה. נוצרו ${created}, עודכנו ${updated}.${failed > 0 ? ` (${failed} שגיאות)` : ''}`,
        failed > 0 ? 'high' : 'normal');
    } else {
      await notifyAdmins(base44, 'יבוא נכשל', 'יבוא אוטומטי נכשל. בדוק לוג.', 'urgent');
    }

    return Response.json({ ok: true, status: finalStatus, logId, summary: { totalRows: rows.length, created, updated, failed } });

  } catch (err) {
    if (logId) {
      await base44.asServiceRole.entities.ImportRun.update(logId, {
        finishedAt: new Date().toISOString(), status: 'FAILED', stage: 'ERROR', errorSummary: err.message,
      }).catch(() => {});
    }
    await notifyAdmins(base44, 'יבוא נכשל', `שגיאה: ${err.message}`, 'urgent').catch(() => {});
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
});