import crypto from 'crypto';

export const COOKIE_NAME = 'med_session';

// Returns the session secret — uses env var in production, safe fallback in dev
function getSecret() {
  const secret = process.env.APP_SESSION_SECRET;
  if (secret) return secret;
  // In production, log a warning but don't crash
  if (process.env.NODE_ENV === 'production') {
    console.warn('[auth] WARNING: APP_SESSION_SECRET not set. Using insecure fallback.');
  }
  return 'med-explainer-dev-fallback-secret-2024';
}

// token format (base64): username.issuedAtMs.hmacSignature
export function createSessionToken(username) {
  try {
    const payload = `${username}.${Date.now()}`;
    const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
    return Buffer.from(`${payload}.${sig}`, 'utf8').toString('base64');
  } catch (err) {
    console.error('[auth] createSessionToken error:', err.message);
    throw err;
  }
}

export function verifySessionToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const lastDot = decoded.lastIndexOf('.');
    if (lastDot === -1) return null;
    const payload = decoded.slice(0, lastDot);
    const sig = decoded.slice(lastDot + 1);
    const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;
    // payload = "username.issuedAtMs"
    const firstDot = payload.indexOf('.');
    if (firstDot === -1) return null;
    const username = payload.slice(0, firstDot);
    const issuedAt = Number(payload.slice(firstDot + 1));
    return { username, issuedAt };
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
    if (key) {
      try { out[key] = decodeURIComponent(val); } catch { out[key] = val; }
    }
  });
  return out;
}

export function getSessionFromReq(req) {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies[COOKIE_NAME];
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

export function buildSessionCookie(token, { remember } = {}) {
  const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 12; // 30 days vs 12 hours
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function buildLogoutCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}
