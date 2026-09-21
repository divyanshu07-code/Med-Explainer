import crypto from 'crypto';
import { createSessionToken, buildSessionCookie } from '../../lib/auth';

function safeEqual(a, b) {
  try {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { username, password, remember } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const expectedUser = process.env.APP_USERNAME;
    const expectedPass = process.env.APP_PASSWORD;

    if (!expectedUser || !expectedPass) {
      return res.status(500).json({ error: 'Server configuration error: login credentials not set.' });
    }

    const userOk = safeEqual(username.trim(), expectedUser);
    const passOk = safeEqual(password, expectedPass);

    if (!userOk || !passOk) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = createSessionToken(expectedUser);
    res.setHeader('Set-Cookie', buildSessionCookie(token, { remember: !!remember }));
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Login handler error:', err);
    return res.status(500).json({ error: 'Internal server error. Please try again.' });
  }
}
