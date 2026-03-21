import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { createHmac, createHash } from 'node:crypto';
import bigInt from 'npm:big-integer@1.6.52';

/**
 * Cognito SRP — מימוש מבוסס על קוד מקורי של amazon-cognito-identity-js
 * https://github.com/aws-amplify/amplify-js/blob/main/packages/amazon-cognito-identity-js/src/AuthenticationHelper.js
 */

const COGNITO_CLIENT_ID = '66iqqmjj6s81d6qu0pvqc4226l';
const COGNITO_REGION    = 'us-east-1';
const COGNITO_POOL_ID   = 'us-east-1_K0OcMyw20';
const POOL_NAME         = COGNITO_POOL_ID.split('_').slice(1).join('_'); // "K0OcMyw20"
const COGNITO_URL       = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/`;

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

const G_HEX = '2';
const N = bigInt(N_HEX, 16);
const g = bigInt(G_HEX, 16);

// ── helpers ───────────────────────────────────────────────────────────────────

/** hex string → Uint8Array */
function h2b(hex) {
  const h = hex.length % 2 ? '0' + hex : hex;
  const b = new Uint8Array(h.length / 2);
  for (let i = 0; i < b.length; i++) b[i] = parseInt(h.substr(i * 2, 2), 16);
  return b;
}

/** Uint8Array → hex string */
function b2h(b) {
  return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
}

/** concat Uint8Arrays */
function cat(...arrs) {
  const len = arrs.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(len); let off = 0;
  for (const a of arrs) { out.set(a, off); off += a.length; }
  return out;
}

/** string → Uint8Array (UTF-8) */
const enc = (s) => new TextEncoder().encode(s);

/** base64 → Uint8Array */
function b64d(s) {
  const bin = atob(s); const b = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
  return b;
}

/** Uint8Array → base64 */
function b64e(b) { return btoa(String.fromCharCode(...b)); }

/** sha256(Uint8Array) → Uint8Array */
function sha256(data) { return createHash('sha256').update(data).digest(); }

/** hmac-sha256(key: Uint8Array, data: Uint8Array) → Uint8Array */
function hmac(key, data) { return createHmac('sha256', key).update(data).digest(); }

/**
 * Pad bigInt hex: ensure even length, prepend 00 if MSB >= 0x80
 * This matches amazon-cognito-identity-js padHex()
 */
function padHex(n) {
  let h = n.toString(16);
  if (h.length % 2 !== 0) h = '0' + h;
  if ('89abcdef'.includes(h[0])) h = '00' + h;
  return h;
}

// ── Precomputed k ─────────────────────────────────────────────────────────────
function computeK() {
  const nH = N_HEX.length % 2 ? '0' + N_HEX : N_HEX;
  const gH = G_HEX.padStart(nH.length, '0');
  return bigInt(b2h(sha256(cat(h2b(nH), h2b(gH)))), 16);
}
const k = computeK();

// ── Cognito SRP auth ──────────────────────────────────────────────────────────

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
  if (!r.ok) throw new Error(`Cognito ${target} נכשל: ${r.status} ${txt.slice(0, 300)}`);
  return JSON.parse(txt);
}

function generateSrpA() {
  const aBytes = crypto.getRandomValues(new Uint8Array(128));
  const a = bigInt(b2h(aBytes), 16).mod(N);
  const A = g.modPow(a, N);
  return { a, A_hex: padHex(A) };
}

function computeU(A_hex, B_hex) {
  const pA = A_hex.length % 2 ? '0' + A_hex : A_hex;
  const pB = B_hex.length % 2 ? '0' + B_hex : B_hex;
  return bigInt(b2h(sha256(cat(h2b(pA), h2b(pB)))), 16);
}

/**
 * Cognito x calculation (matches AuthenticationHelper.js exactly):
 * x = H(SALT || H(poolName || username || password))
 * Note: NO colon separator — direct concatenation of strings
 */
function computeX(saltHex, username, password) {
  // inner = sha256(POOL_NAME + username + password)  (as UTF-8 bytes)
  const inner = sha256(enc(POOL_NAME + username + password));
  const saltB = h2b(saltHex.length % 2 ? '0' + saltHex : saltHex);
  return bigInt(b2h(sha256(cat(saltB, inner))), 16);
}

function computeS(a, B_big, u, x) {
  const B = B_big;
  if (B.mod(N).equals(bigInt.zero)) throw new Error('B mod N == 0');
  // S = (B - k * g^x) ^ (a + u * x) mod N
  let base = B.subtract(k.multiply(g.modPow(x, N))).mod(N);
  if (base.isNegative()) base = base.add(N);
  const exp = a.add(u.multiply(x));
  return base.modPow(exp, N);
}

function computeHkdfKey(A_hex, B_hex, S) {
  // salt = H(A || B)  — same bytes used for u
  const pA = A_hex.length % 2 ? '0' + A_hex : A_hex;
  const pB = padHex(B);
  const uHash = sha256(cat(h2b(pA), h2b(pB)));
  // HKDF-Extract: PRK = HMAC(key=salt, data=IKM)  → key=uHash, data=S_bytes
  const S_bytes = h2b(padHex(S));
  const prk = hmac(uHash, S_bytes);
  // HKDF-Expand:  T(1) = HMAC(key=PRK, data=info||0x01)
  const T = hmac(prk, cat(enc('Caldera Derived Key'), new Uint8Array([0x01])));
  return T.slice(0, 16);
}

function cognitoTimestamp() {
  const D = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now = new Date();
  const d = String(now.getUTCDate()).padStart(2, ' ');
  const t = `${pad2(now.getUTCHours())}:${pad2(now.getUTCMinutes())}:${pad2(now.getUTCSeconds())}`;
  return `${D[now.getUTCDay()]} ${M[now.getUTCMonth()]} ${d} ${t} UTC ${now.getUTCFullYear()}`;
}
function pad2(n) { return String(n).padStart(2, '0'); }

async function srpAuth(username, password) {
  const { a, A_hex } = generateSrpA();

  console.log('[SRP] InitiateAuth...');
  const init = await cognitoPost('InitiateAuth', {
    AuthFlow: 'USER_SRP_AUTH',
    ClientId: COGNITO_CLIENT_ID,
    AuthParameters: { USERNAME: username, SRP_A: A_hex },
    ClientMetadata: {},
  });

  if (init.ChallengeName !== 'PASSWORD_VERIFIER') {
    throw new Error(`Challenge לא צפוי: ${init.ChallengeName} — ${JSON.stringify(init).slice(0, 300)}`);
  }

  const { SRP_B, SALT, SECRET_BLOCK, USER_ID_FOR_SRP } = init.ChallengeParameters;
  console.log(`[SRP] USER_ID_FOR_SRP="${USER_ID_FOR_SRP}"`);

  const B_big = bigInt(SRP_B, 16);
  const u = computeU(A_hex, padHex(B_big));
  const x = computeX(SALT, USER_ID_FOR_SRP, password);
  const S = computeS(a, B_big, u, x);

  const hkdfKey = computeHkdfKey(A_hex, B_big, S);
  const ts = cognitoTimestamp();

  const msgBytes = cat(enc(POOL_NAME), enc(USER_ID_FOR_SRP), b64d(SECRET_BLOCK), enc(ts));
  const sig = b64e(hmac(hkdfKey, msgBytes));

  console.log('[SRP] RespondToAuthChallenge...');
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

  console.log('[SRP] respond ChallengeName:', respond.ChallengeName ?? 'none (success)');

  if (respond.ChallengeName === 'DEVICE_SRP_AUTH' || respond.ChallengeName === 'DEVICE_PASSWORD_VERIFIER') {
    throw new Error(`נדרש אימות מכשיר (${respond.ChallengeName}). יש לכבות "זכור מכשיר" ב-Cognito.`);
  }

  const token = respond?.AuthenticationResult?.AccessToken;
  if (!token) throw new Error(`לא התקבל AccessToken: ${JSON.stringify(respond).slice(0, 300)}`);
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
      throw new Error(`שליפת נתוני חוב נכשלה: ${debtResp.status} ${txt.slice(0, 200)}`);
    }

    const debtJson = await debtResp.json();
    console.log('[Import] מבנה תשובה:', Object.keys(debtJson).join(', '));

    let rows = [];
    if (Array.isArray(debtJson)) rows = debtJson;
    else if (Array.isArray(debtJson?.data)) rows = debtJson.data;
    else if (Array.isArray(debtJson?.apartments)) rows = debtJson.apartments;
    else if (Array.isArray(debtJson?.debts)) rows = debtJson.debts;
    else if (Array.isArray(debtJson?.results)) rows = debtJson.results;
    else throw new Error(`מבנה תשובה לא מזוהה: ${Object.keys(debtJson).join(', ')}. ${JSON.stringify(debtJson).slice(0, 400)}`);

    if (rows.length === 0) throw new Error('API החזיר 0 שורות');
    console.log(`[Import] ${rows.length} שורות`);

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