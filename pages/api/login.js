// Login API — accepts any non-empty username + password (open access mode).
// Session cookie is signed with APP_SESSION_SECRET (falls back to dev secret locally).

import { createSessionToken, buildSessionCookie } from '../../lib/auth';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password, remember } = req.body || {};

    // Basic validation — just make sure fields aren't empty
    if (!username || !String(username).trim()) {
      return res.status(400).json({ error: 'Please enter a username.' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Please enter a password.' });
    }

    // Create a signed session token for the user (any name is accepted)
    const token = createSessionToken(String(username).trim());
    res.setHeader('Set-Cookie', buildSessionCookie(token, { remember: !!remember }));

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[login] Error:', err.message);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
}
