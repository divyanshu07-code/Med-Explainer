import Head from 'next/head';
import { useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { getSessionFromReq } from '../lib/auth';

export async function getServerSideProps({ req }) {
  const session = getSessionFromReq(req);
  if (!session) {
    return { redirect: { destination: '/login', permanent: false } };
  }
  return { props: { username: session.username || '' } };
}

export default function Home({ username }) {
  const router = useRouter();
  const [mode, setMode] = useState('image'); // 'image' | 'text'
  const [preview, setPreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [medicineName, setMedicineName] = useState('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);
  const resultRef = useRef(null);

  function handleFile(file) {
    if (!file) return;
    setError(null);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const [prefix, base64] = dataUrl.split(',');
      const mt = prefix.match(/data:(.*);base64/)?.[1] || 'image/jpeg';
      setPreview(dataUrl);
      setImageBase64(base64);
      setMediaType(mt);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (mode === 'image' && !imageBase64) {
      setError('Please upload or take a photo first.');
      return;
    }
    if (mode === 'text' && !medicineName.trim()) {
      setError('Please type a medicine name.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          mode === 'image'
            ? { mode, imageBase64, mediaType, context }
            : { mode, medicineName, context }
        ),
      });

      let data;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        throw new Error('Unexpected server response. Please try again.');
      }

      if (!res.ok) throw new Error(data?.error || 'Something went wrong.');
      setResult(data.result);

      // Smooth scroll to results
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setPreview(null);
    setImageBase64(null);
    setMediaType(null);
    setMedicineName('');
    setContext('');
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
  }

  const confidenceLabel = result?.confidence === 'high'
    ? '✓ High confidence'
    : result?.confidence === 'medium'
    ? '◎ Medium confidence'
    : '⚠ Low confidence';

  return (
    <>
      <Head>
        <title>MedExplainer — AI Medicine Info</title>
        <meta name="description" content="Upload a photo of a medicine label or type a name — get a plain-language explanation powered by Gemini AI." />
      </Head>

      <div className="page">
        {/* Topbar */}
        <div className="topbar">
          <div className="brand">
            <div className="brand-mark">💊</div>
            <span>MedExplainer</span>
          </div>
          <button type="button" className="btn-logout" onClick={handleLogout} id="logout-btn">
            {username ? `👋 ${username}` : ''} Sign out
          </button>
        </div>

        {/* Hero */}
        <header className="hero">
          <div className="hero-badge">✦ Powered by Gemini AI</div>
          <h1>Understand your medicine<br />in plain language</h1>
          <p>
            Snap a photo of a label or prescription, or just type the name —
            get a clear, jargon-free breakdown of what it does, how to take it, and what to watch for.
          </p>
        </header>

        {/* Main Form Card */}
        <form className="card" onSubmit={handleSubmit} id="main-form">
          {/* Mode Tabs */}
          <div className="tabs">
            <button
              type="button"
              id="tab-photo"
              className={mode === 'image' ? 'tab active' : 'tab'}
              onClick={() => { setMode('image'); setError(null); }}
            >
              📷 Photo of label
            </button>
            <button
              type="button"
              id="tab-text"
              className={mode === 'text' ? 'tab active' : 'tab'}
              onClick={() => { setMode('text'); setError(null); }}
            >
              ⌨️ Type name instead
            </button>
          </div>

          {/* Input Area */}
          {mode === 'image' ? (
            <div
              className="upload-zone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
            >
              {preview ? (
                <img src={preview} alt="Uploaded medicine label" className="preview" />
              ) : (
                <div className="upload-empty">
                  <span className="upload-icon">🏷️</span>
                  <p>Drag & drop or click to upload</p>
                  <p>Photo of medicine package, bottle, or prescription label</p>
                  <p className="upload-tip">
                    💡 Tip: photograph the printed label — pill shape alone isn't reliable
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                id="file-input"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
          ) : (
            <input
              id="medicine-name-input"
              type="text"
              className="text-input"
              placeholder="e.g. Amoxicillin 500mg, Paracetamol, Voltaren…"
              value={medicineName}
              onChange={(e) => setMedicineName(e.target.value)}
            />
          )}

          {/* Context */}
          <label className="field-label" htmlFor="context-input">
            Allergies, other medicines, or a question? <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span>
          </label>
          <textarea
            id="context-input"
            className="context-input"
            placeholder="e.g. I'm allergic to penicillin. I also take ibuprofen daily."
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />

          {/* Actions */}
          <div className="actions">
            <button type="submit" id="submit-btn" className="primary" disabled={loading}>
              {loading ? '⏳ Analyzing…' : '✦ Explain this medicine'}
            </button>
            <button type="button" id="clear-btn" className="ghost" onClick={reset}>Clear</button>
          </div>

          {error && <div className="error" id="error-msg">{error}</div>}
        </form>

        {/* Results */}
        {result && (
          <div className="results" id="results-section" ref={resultRef}>
            {/* Header */}
            <div className="result-header">
              <div>
                <h2>{result.medicineName}</h2>
                {result.genericName && (
                  <p className="generic">Generic: {result.genericName}</p>
                )}
              </div>
              <span className={`confidence ${result.confidence}`}>{confidenceLabel}</span>
            </div>

            {/* Purpose + How to take */}
            <div className="result-grid">
              <div className="result-card">
                <span className="result-card-icon">🎯</span>
                <h3>What it's for</h3>
                <p>{result.purpose}</p>
              </div>
              <div className="result-card">
                <span className="result-card-icon">💊</span>
                <h3>How it's taken</h3>
                <p>{result.howToTake}</p>
              </div>
            </div>

            {/* Side effects + Seek help */}
            <div className="result-grid">
              <div className="result-card">
                <span className="result-card-icon">📋</span>
                <h3>Common side effects</h3>
                <ul>
                  {result.commonSideEffects?.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              <div className="result-card warn">
                <span className="result-card-icon">🚨</span>
                <h3>Seek help if…</h3>
                <ul>
                  {result.seekHelpIf?.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            </div>

            {/* Interactions */}
            {result.interactionsNote && (
              <div className="result-card note" style={{ marginBottom: 12 }}>
                <span className="result-card-icon">⚡</span>
                <h3>Interactions & cautions</h3>
                <p>{result.interactionsNote}</p>
              </div>
            )}

            {/* Disclaimer */}
            <div className="disclaimer">
              ⚕️&nbsp;
              {result.disclaimer || 'This is general information only — not medical advice. Always follow your doctor\'s or pharmacist\'s instructions, and consult them directly about anything specific to your situation.'}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
