import crypto from 'crypto';
import { createSessionToken, buildSessionCookie } from '../../lib/auth';

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const expectedUser = process.env.APP_USERNAME;
  const expectedPass = process.env.APP_PASSWORD;

  if (!expectedUser || !expectedPass || !process.env.APP_SESSION_SECRET) {
    return res.status(500).json({
      error: 'Server is missing APP_USERNAME / APP_PASSWORD / APP_SESSION_SECRET env vars.',
    });
  }

  const { username, password, remember } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const userOk = safeEqual(username, expectedUser);
  const passOk = safeEqual(password, expectedPass);
  if (!userOk || !passOk) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const token = createSessionToken(expectedUser);
  res.setHeader('Set-Cookie', buildSessionCookie(token, { remember: !!remember }));
  return res.status(200).json({ ok: true });
}
