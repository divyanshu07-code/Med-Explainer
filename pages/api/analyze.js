import { getSessionFromReq } from '../../lib/auth';
import { checkRateLimit, getClientIp } from '../../lib/rateLimit';

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
};

const SYSTEM_PROMPT = `You are a careful pharmacist's assistant helping someone understand a medicine they have already been prescribed or purchased.

Rules:
- Only explain information visible on the label/photo, or well-established public information about the named drug.
- NEVER invent or guess a specific dosage not clearly visible. Say "check the label" or "ask your pharmacist" instead.
- For allergies/other medicines: give general well-known caution notes, never a definitive personal judgment. Always direct to pharmacist or doctor.
- Keep language plain, warm, easy for a non-medical reader. Briefly explain any medical term you use.
- If image is unclear or medicine unidentifiable, say so honestly rather than guessing.
- Respond with ONLY valid JSON matching exactly this schema (no markdown fences, no preamble):
{
  "medicineName": string,
  "genericName": string | null,
  "purpose": string,
  "howToTake": string,
  "commonSideEffects": string[],
  "seekHelpIf": string[],
  "interactionsNote": string,
  "confidence": "high" | "medium" | "low",
  "disclaimer": string
}`;

// ── Verified-working models on v1beta (as of 2026) ──
// Only 503/429 triggers fallback. 404 = model gone, skip immediately.
const MODELS = [
  'gemini-3.6-flash',      // Primary — recommended by Google AI
  'gemini-2.5-flash',      // Stable fallback
  'gemini-2.5-flash-lite', // Lightweight last resort
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Call one model, retry up to `maxRetries` times on 503/429 with exponential backoff
async function callModel(apiKey, model, payload, maxRetries = 3) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (networkErr) {
      // Network failure — wait and retry
      if (attempt < maxRetries) { await sleep(1000 * (attempt + 1)); continue; }
      throw networkErr;
    }

    // On overload / rate-limit → wait and retry same model
    if ((res.status === 503 || res.status === 429) && attempt < maxRetries) {
      await sleep(2000 * (attempt + 1)); // 2 s, 4 s, 6 s
      continue;
    }

    return res; // Return whatever we got (ok or other error)
  }
}

// Try each model in order; skip to next only on 503/429/404 after exhausting retries
async function callWithFallback(apiKey, payload) {
  for (const model of MODELS) {
    try {
      const res = await callModel(apiKey, model, payload);
      if (!res) continue;

      // Model doesn't exist → try next one silently
      if (res.status === 404) { console.warn(`[analyze] ${model} not found, trying next…`); continue; }

      // Still overloaded after all retries → try next model
      if (res.status === 503 || res.status === 429) { console.warn(`[analyze] ${model} overloaded, trying next…`); continue; }

      // Any other status (200 = success, 400/401/500 = real error) → return immediately
      return { res, model };
    } catch (err) {
      console.warn(`[analyze] ${model} network error:`, err.message);
      continue;
    }
  }

  return { res: null, model: null }; // All models exhausted
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = getSessionFromReq(req);
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated. Please log in.' });
  }

  const ip = getClientIp(req);
  const { allowed, retryAfterMs } = checkRateLimit(ip);
  if (!allowed) {
    const minutes = Math.ceil(retryAfterMs / 60000);
    return res.status(429).json({ error: `Too many requests. Please try again in about ${minutes} minute(s).` });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not set on the server.' });
  }

  const { mode, imageBase64, mediaType, medicineName, context } = req.body || {};
  let userParts = [];

  if (mode === 'image') {
    if (!imageBase64 || !mediaType) return res.status(400).json({ error: 'Missing image data.' });
    userParts.push({
      text: 'This is a photo of a medicine package, bottle, or prescription label. Identify and explain it.' +
        (context ? `\n\nUser context (allergies / other medicines / questions): ${context}` : ''),
    });
    userParts.push({ inline_data: { mime_type: mediaType, data: imageBase64 } });
  } else if (mode === 'text') {
    if (!medicineName?.trim()) return res.status(400).json({ error: 'Missing medicine name.' });
    userParts.push({
      text: `Explain this medicine: ${medicineName.trim()}` +
        (context ? `\n\nUser context (allergies / other medicines / questions): ${context}` : ''),
    });
  } else {
    return res.status(400).json({ error: 'Invalid mode.' });
  }

  const payload = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: userParts }],
    generationConfig: { maxOutputTokens: 1000, responseMimeType: 'application/json' },
  };

  try {
    const { res: geminiRes, model } = await callWithFallback(apiKey, payload);

    if (!geminiRes) {
      return res.status(503).json({
        error: 'All AI models are currently busy. Please wait 30 seconds and try again.',
      });
    }

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => '');
      return res.status(geminiRes.status).json({
        error: `AI error (${geminiRes.status}): ${errText.slice(0, 300)}`,
      });
    }

    const data = await geminiRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    if (!text) return res.status(500).json({ error: 'No content returned from AI.' });

    let parsed;
    try {
      const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ error: 'Could not parse AI response as JSON.', raw: text.slice(0, 200) });
    }

    return res.status(200).json({ result: parsed, modelUsed: model });
  } catch (err) {
    return res.status(500).json({ error: 'Request to AI failed: ' + err.message });
  }
}
