import { useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { getSessionFromReq } from '../lib/auth';

export async function getServerSideProps({ req }) {
  const session = getSessionFromReq(req);
  if (!session) {
    return { redirect: { destination: '/login', permanent: false } };
  }
  return { props: {} };
}

export default function Home() {
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
      setError('Please add a photo first.');
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setResult(data.result);
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

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" className="ghost" onClick={handleLogout} style={{ padding: '6px 12px', fontSize: 12.5 }}>
          Log out
        </button>
      </div>
      <header className="hero">
        <span className="pill">plain-language medicine info</span>
        <h1>What does my medicine actually do?</h1>
        <p>Snap a photo of a label or prescription, or just type the name — get a clear, jargon-free explanation of what it's for, how it's taken, and what to watch out for.</p>
      </header>

      <form className="card" onSubmit={handleSubmit}>
        <div className="tabs">
          <button type="button" className={mode === 'image' ? 'tab active' : 'tab'} onClick={() => setMode('image')}>
            📷 Photo of label
          </button>
          <button type="button" className={mode === 'text' ? 'tab active' : 'tab'} onClick={() => setMode('text')}>
            ⌨️ Type name instead
          </button>
        </div>

        {mode === 'image' ? (
          <div className="upload-zone">
            {preview ? (
              <img src={preview} alt="Uploaded medicine label" className="preview" />
            ) : (
              <div className="upload-empty">
                <div className="upload-icon">💊</div>
                <p>Upload or take a photo of the label, bottle, or prescription</p>
                <p className="upload-tip">Tip: photograph the printed label, not a loose pill — pill shape/color alone isn't reliable enough to identify.</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
        ) : (
          <input
            type="text"
            className="text-input"
            placeholder="e.g. Amoxicillin 500mg"
            value={medicineName}
            onChange={(e) => setMedicineName(e.target.value)}
          />
        )}

        <label className="field-label">Allergies, other medicines, or a question? (optional)</label>
        <textarea
          className="context-input"
          placeholder="e.g. I'm allergic to penicillin. I also take ibuprofen daily."
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />

        <div className="actions">
          <button type="submit" className="primary" disabled={loading}>
            {loading ? 'Analyzing…' : 'Explain this medicine'}
          </button>
          <button type="button" className="ghost" onClick={reset}>Clear</button>
        </div>

        {error && <div className="error">{error}</div>}
      </form>

      {result && (
        <div className="results">
          <div className="result-header">
            <div>
              <h2>{result.medicineName}</h2>
              {result.genericName && <p className="generic">Generic name: {result.genericName}</p>}
            </div>
            <span className={`confidence ${result.confidence}`}>{result.confidence} confidence</span>
          </div>

          <div className="result-grid">
            <div className="result-card">
              <h3>What it's for</h3>
              <p>{result.purpose}</p>
            </div>
            <div className="result-card">
              <h3>How it's taken</h3>
              <p>{result.howToTake}</p>
            </div>
          </div>

          <div className="result-grid">
            <div className="result-card">
              <h3>Common side effects</h3>
              <ul>
                {result.commonSideEffects?.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <div className="result-card warn">
              <h3>Seek help if…</h3>
              <ul>
                {result.seekHelpIf?.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          </div>

          {result.interactionsNote && (
            <div className="result-card note">
              <h3>Interactions &amp; cautions</h3>
              <p>{result.interactionsNote}</p>
            </div>
          )}

          <div className="disclaimer">⚕️ {result.disclaimer || 'This is general information, not medical advice. Always follow your doctor\u2019s or pharmacist\u2019s instructions, and ask them directly about anything specific to you.'}</div>
        </div>
      )}
    </div>
  );
}
