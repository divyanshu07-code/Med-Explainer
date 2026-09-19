import crypto from 'crypto';

export const COOKIE_NAME = 'med_session';

function getSecret() {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret) {
    throw new Error('APP_SESSION_SECRET is not set.');
  }
  return secret;
}

// token format (base64): username.issuedAtMs.hmacSignature
export function createSessionToken(username) {
  const payload = `${username}.${Date.now()}`;
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
  return Buffer.from(`${payload}.${sig}`, 'utf8').toString('base64');
}

export function verifySessionToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split('.');
    if (parts.length !== 3) return null;
    const [username, issuedAt, sig] = parts;
    const expected = crypto.createHmac('sha256', getSecret()).update(`${username}.${issuedAt}`).digest('hex');
    // Constant-time compare to avoid timing attacks.
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    return { username, issuedAt: Number(issuedAt) };
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader) {
  const out = {};
  (cookieHeader || '').split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  });
  return out;
}

export function getSessionFromReq(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  return verifySessionToken(token);
}

export function buildSessionCookie(token, { remember }) {
  const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 12; // 30 days vs 12 hours
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function buildLogoutCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}
