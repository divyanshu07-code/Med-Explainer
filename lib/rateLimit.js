// Best-effort in-memory rate limiter.
// NOTE: on Vercel serverless, each function instance has its own memory,
// and memory resets on cold start. This means the limit is per-instance,
// not a perfectly global limit. It still meaningfully slows down casual
// abuse/scraping, but it is not a hard guarantee under heavy/distributed
// traffic. For a stricter limit, use a shared store (e.g. Upstash Redis).

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 10; // per IP, per window

const hits = new Map(); // ip -> array of request timestamps (ms)

export function checkRateLimit(ip) {
  const now = Date.now();
  const key = ip || 'unknown';
  const timestamps = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);

  if (timestamps.length >= MAX_REQUESTS) {
    const retryAfterMs = WINDOW_MS - (now - timestamps[0]);
    return { allowed: false, retryAfterMs };
  }

  timestamps.push(now);
  hits.set(key, timestamps);
  return { allowed: true };
}

export function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}
