import { createSessionToken, buildSessionCookie } from '../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  const { username, password, remember } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({
      error: 'Username and password are required.'
    });
  }

  // Accept any username and password
  const token = createSessionToken(username.trim());

  res.setHeader(
    'Set-Cookie',
    buildSessionCookie(token, {
      remember: !!remember
    })
  );

  return res.status(200).json({
    ok: true
  });
}
