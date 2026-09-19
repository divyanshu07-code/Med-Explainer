# Medicine Explainer

Upload a photo of a prescription/medicine label (or just type the name) and get a plain-language explanation: what it's for, how it's taken, common side effects, red flags to watch for, and interaction cautions — powered by Google's Gemini vision + reasoning (free tier).

## Why this architecture

The Gemini API key is used **server-side only**, inside `pages/api/analyze.js`, which runs as a Vercel serverless function. The browser never sees the key. This is the correct pattern for any real deployment — never put an API key in client-side JavaScript.

## Local setup

```bash
npm install
cp .env.local.example .env.local
# edit .env.local and paste your real Gemini API key
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel

1. Push this folder to a GitHub repo (or run `vercel` from inside this folder with the Vercel CLI).
2. In the Vercel dashboard: **Import Project** → select the repo.
3. Before the first deploy (or in Project Settings → Environment Variables), add:
   - `GEMINI_API_KEY` = your free key from https://aistudio.google.com/apikey
   - `APP_USERNAME` = the username you want to log in with
   - `APP_PASSWORD` = the password you want to log in with
   - `APP_SESSION_SECRET` = a long random string (generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
4. Deploy. Vercel auto-detects Next.js — no extra config needed.

## What to say in your demo

1. Open the app, tap "Photo of label," take a photo of any real medicine box or prescription bottle.
2. While it's "thinking," explain the architecture in one sentence: "The photo goes to a serverless function, which asks Gemini to read the label and explain it — the API key never touches the browser."
3. Show the result: purpose, how to take it, side effects, red-flag symptoms, and the disclaimer.
4. Mention the safety design choice: it's explicitly instructed never to invent a dosage that isn't visible on the label — it says "check the label" or "ask your pharmacist" instead of guessing.

## Notes

- Model used: `gemini-2.0-flash` (edit the `GEMINI_MODEL` constant in `pages/api/analyze.js` if you want a different available Gemini model, e.g. `gemini-1.5-flash`).
- This is informational only, not medical advice — the disclaimer is always shown with every result, and the system prompt is written to avoid guessing anything not visible on the label.
- The app is gated behind a single login (`/login`) using the `APP_USERNAME` / `APP_PASSWORD` env vars, so the Gemini API can't be hit by random visitors if the link gets shared. This is a simple shared-password gate, not a full multi-user account system.
- `pages/api/analyze.js` also applies a best-effort per-IP rate limit (10 requests / 15 min) on top of the login requirement — see `lib/rateLimit.js` for its limitations on serverless.
