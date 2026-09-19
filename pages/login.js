import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getSessionFromReq } from '../lib/auth';

export async function getServerSideProps({ req }) {
  // Already logged in? Skip the login page.
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

    if (!username.trim() || !password) {
      setError('username and password are both required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password, remember }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid credentials.');
      router.push('/');
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>Login — Medicine Explainer</title>
      </Head>
      <div className="login-page">
        <header className="brand-bar">
          <div className="brand">
            <span className="brand-icon">Rx</span>
            <span className="brand-name">Medicine Explainer</span>
          </div>
        </header>

        <main className="login-wrap">
          <div className="terminal-card">
            <div className="terminal-titlebar">
              <span className="dot dot-red" />
              <span className="dot dot-amber" />
              <span className="dot dot-green" />
              <span className="terminal-title">med-explainer — auth.session — zsh</span>
            </div>

            <div className="terminal-body">
              <pre className="terminal-log">
{`$ med-explainer --init
`}<span className="ok">✓</span>{` environment loaded
`}<span className="ok">✓</span>{` pharmacist model connected`}
              </pre>

              <pre className="code-block">
                <span className="ln">1</span>
                <span className="kw">const</span> user = <span className="str">&quot;{username || ''}&quot;</span>;{'\n'}
                <span className="ln">2</span>
                {'\n'}
                <span className="ln">3</span>
                <span className="fn">login</span>(user, password); <span className="cmt">// press ⏎ to run</span>
              </pre>

              <form onSubmit={handleSubmit} className="login-form">
                <label className="field-label" htmlFor="username">
                  <span className="type">str</span> username <span className="req">*</span>
                </label>
                <div className="field">
                  <span className="prompt">{'>'}</span>
                  <input
                    id="username"
                    type="text"
                    placeholder="e.g. tourist"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                  />
                </div>

                <label className="field-label" htmlFor="password">
                  <span className="type">secret</span> password <span className="req">*</span>
                </label>
                <div className="field">
                  <span className="prompt">{'>'}</span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
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

                {error && <div className="error-line">! {error}</div>}

                <div className="row-between">
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    <span>remember_session = {String(remember)}</span>
                  </label>
                  <a href="#" className="forgot-link">forgot password?</a>
                </div>

                <button type="submit" className="run-btn" disabled={submitting}>
                  {submitting ? '> running…' : '>_ run login()'}
                </button>

                <p className="hint">or press <kbd>Enter</kbd> from any field</p>
              </form>
            </div>
          </div>
        </main>
      </div>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          background: #0b0e14;
          color: #d6dde6;
          font-family: 'Inter', system-ui, sans-serif;
        }
        .brand-bar {
          display: flex;
          align-items: center;
          padding: 18px 28px;
          border-bottom: 1px solid #1c222c;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          font-size: 18px;
          color: #f2f5f8;
        }
        .brand-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: linear-gradient(135deg, #3ddc97, #2f9cf0);
          color: #05130f;
          font-weight: 800;
          font-size: 13px;
        }
        .login-wrap {
          display: flex;
          justify-content: center;
          padding: 56px 20px 80px;
        }
        .terminal-card {
          width: 100%;
          max-width: 560px;
          background: #10141d;
          border: 1px solid #232a36;
          border-radius: 14px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
          overflow: hidden;
        }
        .terminal-titlebar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: #161b26;
          border-bottom: 1px solid #232a36;
        }
        .dot {
          width: 11px;
          height: 11px;
          border-radius: 50%;
          display: inline-block;
        }
        .dot-red { background: #ef5a52; }
        .dot-amber { background: #f4b942; }
        .dot-green { background: #3ecf6e; }
        .terminal-title {
          margin-left: 8px;
          font-family: 'SFMono-Regular', Menlo, Consolas, monospace;
          font-size: 12.5px;
          color: #7c8798;
        }
        .terminal-body {
          padding: 22px 24px 26px;
        }
        .terminal-log {
          font-family: 'SFMono-Regular', Menlo, Consolas, monospace;
          font-size: 13px;
          line-height: 1.7;
          color: #8a94a3;
          margin: 0 0 14px;
          white-space: pre-wrap;
        }
        .terminal-log .ok { color: #3ecf6e; }
        .code-block {
          font-family: 'SFMono-Regular', Menlo, Consolas, monospace;
          font-size: 13px;
          line-height: 1.9;
          background: #0c0f16;
          border: 1px solid #1e2530;
          border-radius: 8px;
          padding: 12px 14px;
          margin: 0 0 22px;
          white-space: pre-wrap;
          color: #c4cdda;
        }
        .code-block .ln {
          display: inline-block;
          width: 18px;
          color: #4a5568;
          user-select: none;
        }
        .code-block .kw { color: #d987e0; }
        .code-block .str { color: #f4b942; }
        .code-block .fn { color: #6fb8f7; }
        .code-block .cmt { color: #5a6577; }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .field-label {
          font-family: 'SFMono-Regular', Menlo, Consolas, monospace;
          font-size: 13px;
          color: #b7c0cd;
          margin-top: 14px;
          margin-bottom: 6px;
        }
        .field-label .type { color: #d987e0; }
        .field-label .req { color: #ef5a52; }
        .field {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #0c0f16;
          border: 1px solid #2a3241;
          border-radius: 8px;
          padding: 12px 14px;
          transition: border-color 0.15s ease;
        }
        .field:focus-within {
          border-color: #3ddc97;
        }
        .prompt {
          font-family: 'SFMono-Regular', Menlo, Consolas, monospace;
          color: #3ecf6e;
          font-size: 14px;
        }
        .field input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #eef2f6;
          font-family: 'SFMono-Regular', Menlo, Consolas, monospace;
          font-size: 14px;
        }
        .field input::placeholder {
          color: #4a5568;
        }
        .eye-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 14px;
          opacity: 0.7;
        }
        .eye-btn:hover { opacity: 1; }
        .error-line {
          margin-top: 10px;
          font-family: 'SFMono-Regular', Menlo, Consolas, monospace;
          font-size: 12.5px;
          color: #ef5a52;
        }
        .row-between {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 18px;
          font-size: 13px;
        }
        .checkbox-row {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #8a94a3;
          font-family: 'SFMono-Regular', Menlo, Consolas, monospace;
          font-size: 12.5px;
          cursor: pointer;
        }
        .checkbox-row input {
          accent-color: #3ecf6e;
          width: 15px;
          height: 15px;
        }
        .forgot-link {
          color: #6fb8f7;
          text-decoration: none;
          font-size: 13px;
        }
        .forgot-link:hover { text-decoration: underline; }
        .run-btn {
          margin-top: 22px;
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 9px;
          font-family: 'SFMono-Regular', Menlo, Consolas, monospace;
          font-size: 15px;
          font-weight: 700;
          color: #06140f;
          background: linear-gradient(90deg, #3ddc97, #2f9cf0);
          cursor: pointer;
          transition: filter 0.15s ease, transform 0.1s ease;
        }
        .run-btn:hover:not(:disabled) { filter: brightness(1.06); }
        .run-btn:active:not(:disabled) { transform: translateY(1px); }
        .run-btn:disabled { opacity: 0.65; cursor: default; }
        .hint {
          text-align: center;
          margin: 14px 0 0;
          font-size: 12px;
          color: #4a5568;
        }
        .hint kbd {
          background: #1c222c;
          border: 1px solid #2a3241;
          border-radius: 4px;
          padding: 1px 6px;
          font-family: 'SFMono-Regular', Menlo, Consolas, monospace;
          color: #b7c0cd;
        }
      `}</style>
    </>
  );
}
