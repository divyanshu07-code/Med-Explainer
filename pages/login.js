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

    if (!username.trim()) {
      setError('Please enter a username.');
      return;
    }
    if (!password) {
      setError('Please enter a password.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password, remember }),
      });

      let data;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error('Server error. Please restart the dev server and try again.');
      }

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
        <meta name="description" content="Sign in to MedExplainer — get plain-language medicine info powered by AI." />
      </Head>

      <div className="login-root">
        {/* Nav */}
        <nav className="login-nav">
          <div className="login-brand">
            <div className="brand-mark">💊</div>
            <span>MedExplainer</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Powered by Gemini AI</div>
        </nav>

        {/* Main */}
        <main className="login-main">
          <div className="login-box">
            {/* Eyebrow */}
            <div className="login-eyebrow">
              <div className="login-dot" />
              <span>Secure Access</span>
            </div>

            <h1>Welcome back</h1>
            <p className="login-subtitle">
              Enter any name and password to access your<br />personal medicine explainer.
            </p>

            {/* Card */}
            <div className="login-card">
              <form onSubmit={handleSubmit}>
                {/* Username */}
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

                {/* Password */}
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

                {/* Remember & error */}
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
                    <span>⚠</span>
                    {error}
                  </div>
                )}

                <button type="submit" className="btn-login" disabled={submitting} id="login-submit-btn">
                  {submitting ? '⏳ Signing in…' : '→ Sign In'}
                </button>
              </form>

              <p className="login-hint">Any username + any password works — just fill both fields</p>
            </div>

            {/* Feature pills */}
            <div className="login-features">
              <div className="login-feat">
                <span className="login-feat-icon">🔒</span>
                API key never exposed to browser
              </div>
              <div className="login-feat">
                <span className="login-feat-icon">⚡</span>
                Gemini AI — instant analysis
              </div>
              <div className="login-feat">
                <span className="login-feat-icon">📷</span>
                Photo or text input
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
