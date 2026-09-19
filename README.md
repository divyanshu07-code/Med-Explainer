# Medicine Explainer

Upload a photo of a prescription/medicine label (or simply type the medicine name) and get a plain-language explanation of:

* What the medicine is used for
* How it is taken, when information is available
* Common side effects
* Red-flag symptoms to watch for
* Important interaction cautions

Powered by Google's Gemini vision + reasoning.

> **Disclaimer:** Medicine Explainer is an informational tool, not a substitute for professional medical advice. Always verify medication information with the medicine label, doctor, or pharmacist.

## 🌐 Access the Website

The deployed application is protected by a simple login so that the Gemini API cannot be freely accessed by anyone who obtains the website link.

### Login credentials

```text
Username: divyanshu
Password: MedExplain2026!
```

Open the deployed website and enter the credentials above on the `/login` page.

> **Important:** Do not share these credentials publicly if the deployed website is intended for private/demo access.

## Why This Architecture

The Gemini API key is used **server-side only**, inside:

```text
pages/api/analyze.js
```

This file runs as a Vercel serverless function.

The browser never receives the Gemini API key. This is the correct architecture for a real deployment because API keys should never be exposed in client-side JavaScript.

### Request flow

```text
User
  ↓
Medicine Explainer Website
  ↓
Login Authentication
  ↓
Upload Medicine Photo / Enter Medicine Name
  ↓
Next.js API Route
  ↓
Gemini API
  ↓
Plain-Language Medicine Explanation
  ↓
Result + Safety Disclaimer
```

## Local Setup

Clone the repository and install the dependencies:

```bash
npm install
```

Create your local environment file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Gemini API key and application credentials.

Example:

```env
GEMINI_API_KEY=your_gemini_api_key
APP_USERNAME=divyanshu
APP_PASSWORD=MedExplain2026!
APP_SESSION_SECRET=your_long_random_session_secret
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Then log in using your configured username and password.

## 🚀 Deploy to Vercel

1. Push this folder to a GitHub repository, or run `vercel` from inside the project folder using the Vercel CLI.
2. Open the Vercel dashboard.
3. Select **Import Project** and choose the GitHub repository.
4. Add the following environment variables before deployment:

```text
GEMINI_API_KEY
APP_USERNAME
APP_PASSWORD
APP_SESSION_SECRET
```

Recommended values for the demo:

```text
APP_USERNAME = divyanshu
APP_PASSWORD = MedExplain2026!
```

For `APP_SESSION_SECRET`, generate a long random value:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

5. Deploy the project.

Vercel automatically detects the Next.js application, so no additional configuration is required.

## 🧪 What to Say in Your Demo

### 1. Demonstrate the login

Open the website and log in using the provided demo credentials.

### 2. Upload a medicine label

Tap **"Photo of label"** and upload a photo of a medicine box, medicine label, or prescription.

You can also enter the medicine name manually if supported by the interface.

### 3. Explain the architecture

While the application is processing the request, explain:

> "The image is sent to a serverless API function, which sends the relevant information to Gemini for analysis. The Gemini API key stays on the server and is never exposed to the browser."

### 4. Show the result

Demonstrate the generated explanation, including:

* Medicine purpose
* Available usage information
* Common side effects
* Red-flag symptoms
* Interaction cautions
* Safety disclaimer

### 5. Explain the safety design

A key safety decision is that the application is instructed **not to invent a dosage or medication instruction that is not visible or reliably available**.

Instead of guessing, the system should direct the user to:

* Check the medicine label
* Contact their doctor
* Ask a pharmacist

## 🔐 Security Design

### API key protection

The Gemini API key is stored as a Vercel environment variable:

```text
GEMINI_API_KEY
```

It is accessed only by the server-side API route.

The key is **not included in frontend JavaScript**.

### Login protection

The application uses a simple shared-password gate:

```text
APP_USERNAME
APP_PASSWORD
APP_SESSION_SECRET
```

This prevents random visitors from directly using the application's Gemini-powered functionality.

> This is a simple demo authentication system, not a full multi-user authentication platform.

### Rate limiting

`pages/api/analyze.js` also applies a best-effort per-IP rate limit.

Current configuration:

```text
10 requests / 15 minutes
```

The rate limit provides an additional layer of protection but should not be considered a complete security solution for a large-scale production application.

## 🤖 AI Model

The application currently uses:

```text
gemini-2.0-flash
```

The model can be changed through the `GEMINI_MODEL` constant in:

```text
pages/api/analyze.js
```

Depending on API availability, another supported Gemini model can be configured.

## 🛡️ Safety & Limitations

Medicine Explainer is designed as an **information and education tool**.

It should not:

* Diagnose a medical condition
* Replace a doctor or pharmacist
* Invent medication dosages
* Assume information that is not visible on a medicine label
* Tell users to ignore professional medical advice

Every result includes a safety disclaimer.

For medication decisions, users should verify the information with the official medicine label and a qualified healthcare professional.

## 🛠️ Tech Stack

* **Frontend:** Next.js / React
* **Backend:** Next.js API Routes
* **AI:** Google Gemini
* **Deployment:** Vercel
* **Authentication:** Environment-variable-based shared login
* **Image Processing:** Gemini vision capabilities
* **Rate Limiting:** Per-IP best-effort rate limiting



## ⚠️ Notes
* The application provides informational explanations and is not medical advice.
* Medication information should always be verified using the medicine label, doctor, or pharmacist.
