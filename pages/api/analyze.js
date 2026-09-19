// Server-side API route. Runs on Vercel as a serverless function.
// The API key lives only in the environment variable — it never reaches the browser.
import { getSessionFromReq } from '../../lib/auth';
import { checkRateLimit, getClientIp } from '../../lib/rateLimit';

export const config = {
  api: {
    bodyParser: { sizeLimit: '10mb' },
  },
};

const SYSTEM_PROMPT = `You are a careful pharmacist's assistant helping someone understand a medicine they have already been prescribed or purchased.

Rules:
- Only explain information that is visible on the label/photo, or well-established public information about the named drug (what it's generally used for, common side effects, standard precautions).
- NEVER invent or guess a specific dosage, frequency, or instruction that is not clearly visible in the image or provided by the user. If dosage isn't visible, say so and recommend checking the label or asking the pharmacist.
- If the user mentions allergies or other medicines, give general, well-known interaction/caution notes (e.g. "commonly interacts with X") but do not give a definitive personal medical judgment — always direct them to confirm with a pharmacist or doctor for anything specific to their situation.
- Keep language plain, warm, and easy to understand for a non-medical reader. Avoid jargon; briefly explain any medical term you must use.
- If the image is unclear, blurry, or you cannot identify the medicine with reasonable confidence, say so honestly rather than guessing.
- Respond with ONLY valid JSON, no markdown code fences, no preamble, matching exactly this schema:
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

// Uses Google's Gemini API (free tier available via a Google AI Studio key).
const GEMINI_MODEL = 'gemini-3.6-flash';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Require a logged-in session, so a leaked/shared link can't be hit anonymously.
  const session = getSessionFromReq(req);
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated. Please log in.' });
  }

  // Best-effort per-IP rate limit on top of auth (see lib/rateLimit.js for caveats).
  const ip = getClientIp(req);
  const { allowed, retryAfterMs } = checkRateLimit(ip);
  if (!allowed) {
    const minutes = Math.ceil(retryAfterMs / 60000);
    return res.status(429).json({ error: `Too many requests. Please try again in about ${minutes} minute(s).` });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY. Set it in your Vercel project environment variables.' });
  }

  const { mode, imageBase64, mediaType, medicineName, context } = req.body || {};

  let userParts = [];

  if (mode === 'image') {
    if (!imageBase64 || !mediaType) {
      return res.status(400).json({ error: 'Missing image data.' });
    }
    userParts.push({
      text:
        'This is a photo of a medicine package, bottle, or prescription label. Identify and explain it.' +
        (context ? `\n\nAdditional context from the user (allergies / other medicines / questions): ${context}` : ''),
    });
    userParts.push({
      inline_data: { mime_type: mediaType, data: imageBase64 },
    });
  } else if (mode === 'text') {
    if (!medicineName || !medicineName.trim()) {
      return res.status(400).json({ error: 'Missing medicine name.' });
    }
    userParts.push({
      text:
        `Explain this medicine: ${medicineName.trim()}` +
        (context ? `\n\nAdditional context from the user (allergies / other medicines / questions): ${context}` : ''),
    });
  } else {
    return res.status(400).json({ error: 'Invalid mode. Use "image" or "text".' });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: userParts }],
          generationConfig: {
            maxOutputTokens: 900,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return res.status(response.status).json({ error: `Gemini API error: ${errText.slice(0, 300)}` });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    if (!text) {
      return res.status(500).json({ error: 'No text content returned from the model.' });
    }

    let parsed;
    try {
      const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return res.status(500).json({ error: 'Could not parse model response as JSON.', raw: text });
    }

    return res.status(200).json({ result: parsed });
  } catch (err) {
    return res.status(500).json({ error: 'Request to Gemini API failed: ' + err.message });
  }
}
