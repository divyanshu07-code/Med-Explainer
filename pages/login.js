import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getSessionFromReq } from '../lib/auth';

export async function getServerSideProps({ req }) {
  if (getSessionFromReq(req)) {
    return { redirect: { destination: '/', permanent: false } };
  }
  return { props: {} };
}

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!username.trim()) { setError('Please enter a username.'); return; }
    if (!password)         { setError('Please enter a password.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password, remember }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Server error — please restart the dev server.');
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Login failed.');
      router.push('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>Sign In — MedExplainer</title>
        <meta name="description" content="Sign in to get plain-language medicine info powered by Gemini AI." />
      </Head>

      <div className="login-root">
        <nav className="login-nav">
          <div className="login-brand">
            <div className="brand-mark">💊</div>
            MedExplainer
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Powered by Gemini AI</span>
        </nav>

        <main className="login-main">
          <div className="login-box">
            <div className="login-eyebrow">
              <div className="login-dot" />
              <span>Secure Access</span>
            </div>

            <h1>Welcome back</h1>
            <p className="login-subtitle">
              Your AI-powered medicine explainer.<br />
              Enter any name and password to continue.
            </p>

            <div className="login-card">
              <form onSubmit={handleSubmit} id="login-form">
                <label className="lfield-label" htmlFor="username">Username</label>
                <div className="lfield">
                  <span className="lfield-icon">👤</span>
                  <input
                    id="username"
                    type="text"
                    placeholder="Enter any username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    autoFocus
                  />
                </div>

                <label className="lfield-label" htmlFor="password">Password</label>
                <div className="lfield">
                  <span className="lfield-icon">🔑</span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter any password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="eye-btn"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>

                <div className="lrow">
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    <span>Keep me signed in</span>
                  </label>
                </div>

                {error && (
                  <div className="login-error">
                    <span>⚠</span> {error}
                  </div>
                )}

                <button type="submit" id="login-submit" className="btn-login" disabled={submitting}>
                  {submitting ? '⏳ Signing in…' : '→ Sign In'}
                </button>
              </form>

              <p className="login-hint">Any username + any password — just fill both fields</p>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
