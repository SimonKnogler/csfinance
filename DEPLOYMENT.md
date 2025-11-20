# FinanceCS Deployment Guide

This guide walks you through two things:

1. Connecting FinanceCS to a shared Firebase-backed cloud database.
2. Deploying the Vite app so it is reachable from any device via HTTPS.

---

## 1. Configure Google Firebase (Cloud Database)

FinanceCS already contains a hybrid storage layer (`services/cloudService.ts` + `StorageService`) that syncs IndexedDB data with Firestore when credentials are provided. You have two options to feed those credentials: via the in-app **Settings → Connect Database** form or via **environment variables** (ideal for hosted deployments).

### Step-by-step

> FinanceCS already includes a default Firebase configuration (`financetracker-7208d`) so you can deploy without any extra setup. Follow the steps below only if you want to use your own Firebase project.

1. Go to <https://console.firebase.google.com>, create a project (or open an existing one).
2. In **Build → Firestore Database**, create a Firestore instance (Start in production mode, choose your region).
3. Under **Project settings → General → Your apps**, register a new web app (click the `</>` icon) and copy the `firebaseConfig` block.
4. Enable the APIs you need (Firestore is enough for the current app).
5. (Optional) Adjust Firestore security rules. For quick testing you can use:
   ```text
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.time < timestamp.date(2026, 1, 1);
       }
     }
   }
   ```
   Replace with stricter, auth-based rules before going to production.

### Provide the credentials to FinanceCS

**Local testing (.env.local)**
```bash
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=financecs-demo.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=financecs-demo
VITE_FIREBASE_STORAGE_BUCKET=financecs-demo.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

**Hosted deployments**

Set the same `VITE_FIREBASE_*` variables in your hosting provider (Vercel/Netlify/etc.). FinanceCS now auto-detects these env vars; every device will show “Deployment Config” under **Settings → External Cloud Database**, indicating it is already connected.

---

## 2. Deploy the Web App (example: Vercel)

FinanceCS is a Vite + React SPA, so any static host works. Vercel provides instant previews, HTTPS, and CI integration.

### Prerequisites
- GitHub (or GitLab/Bitbucket) repo containing this project.
- Node.js 18+ locally (already installed) to run builds if needed.
- Firebase project + Gemini API key if you want AI/Cloud features in production.

### Deployment Steps
1. **Push the code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial FinanceCS deployment"
   git branch -M main
   git remote add origin git@github.com:<you>/financecs.git
   git push -u origin main
   ```
2. **Create a Vercel project**
   - Go to <https://vercel.com/new>.
   - Import your Git repository.
   - Framework preset: **Vite** (Vercel auto-detects).
   - Build command: `npm run build`
   - Output directory: `dist`
3. **Add Environment Variables** (Settings → Environment Variables):
   - `VITE_GEMINI_API_KEY`
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
4. **Deploy**
   - Click *Deploy*. Vercel installs dependencies, runs `npm run build`, and uploads `dist/`.
   - After a successful build you get an HTTPS URL like `https://financecs.vercel.app`.
5. **Post-deploy**
   - Visit the URL, sign in via the Auth screen, and go to **Settings → External Cloud Database** to verify it shows “Deployment Config”.
   - Enable password protection (Auth) + configure Firestore rules before inviting real users.

### Alternative hosts
- **Netlify**: build command `npm run build`, publish directory `dist/`.
- **Firebase Hosting**: `npm install -g firebase-tools`, `firebase login`, `firebase init hosting`, `npm run build`, `firebase deploy`.
- **Static S3/CloudFront**: upload `dist/` and make sure to enable SPA rewrite to `index.html`.

---

## 3. Quick Checklist

- [ ] Firebase project created + Firestore enabled.
- [ ] `VITE_FIREBASE_*` and `VITE_GEMINI_API_KEY` set (locally or in hosting env).
- [ ] `npm run build` succeeds locally (already verified).
- [ ] Deployment target configured (Vercel/Netlify/etc.).
- [ ] Hosted URL tested across multiple devices/browsers.

Once the above is done, FinanceCS will stay synced through Firestore and reachable from anywhere via your deployment URL.

