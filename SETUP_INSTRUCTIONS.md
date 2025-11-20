# FinanceCS - Setup Instructions

## Issues Fixed ✅

### 1. Gemini AI API Integration
- ✅ Fixed incorrect API usage in `services/geminiService.ts`
- ✅ Changed from `process.env.API_KEY` to `import.meta.env.VITE_GEMINI_API_KEY`
- ✅ Updated API calls to use correct `@google/genai` SDK methods
- ✅ Changed model from `gemini-2.5-flash` to `gemini-2.0-flash-exp` (available model)

### 2. Vite Configuration
- ✅ Removed unnecessary environment variable definitions from `vite.config.ts`
- ✅ Vite automatically handles `VITE_` prefixed environment variables

### 3. Version Mismatches
- ✅ Updated React version in `index.html` to 18.3.1 so it stays aligned with `package.json`
- ✅ Updated Firebase version in `index.html` to 10.14.0 to match the installed SDK

## Required Steps to Run the App

### Step 1: Install Node.js (skip if already installed)
If you still need to install it:

1. Download Node.js from: https://nodejs.org/
2. Install the LTS (Long Term Support) version
3. Restart your terminal/PowerShell after installation
4. Verify installation: `node --version` and `npm --version`

### Step 2: (Optional) Override the default Firebase project
FinanceCS already ships pre-connected to the shared project `financetracker-7208d`, so you can skip this unless you want to point the app at your own Firebase instance. To override, create a file named `.env.local` in the root directory with the following content:

```bash
# Gemini API Key (REQUIRED for AI features)
# Get your API key from: https://ai.google.dev/
VITE_GEMINI_API_KEY=your_actual_api_key_here

# Firebase Configuration (OPTIONAL - only needed for cloud sync)
# Get these from your Firebase project settings
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

**Important:** 
- Replace `your_actual_api_key_here` with your real Gemini API key
- Get a free API key from: https://ai.google.dev/
- Leaving the Firebase section empty means the built-in project `financetracker-7208d` will be used automatically

### Step 3: Install Dependencies
Open PowerShell in the project directory and run:
```bash
npm install
```

### Step 4: Run the App
```bash
npm run dev
```

The app should open at: http://localhost:3000

## App Features

### Working Without API Keys
- ✅ View transactions (uses local storage or mock data)
- ✅ Add/edit transactions manually
- ✅ View charts and analytics
- ✅ Manage portfolio (with mock stock data)
- ✅ Upload and view documents
- ❌ AI-powered transaction categorization (requires Gemini API key)
- ❌ AI financial insights (requires Gemini API key)
- ❌ Cloud sync across devices (requires Firebase)

### AI Features (Requires Gemini API Key)
- 🤖 Auto-categorize transactions using AI
- 🤖 Generate financial insights and advice
- 🤖 Detect spending anomalies
- 🤖 Predict future expenses

### Cloud Sync (Requires Firebase)
- ☁️ Sync data across multiple devices
- ☁️ Backup transactions, portfolio, and documents
- ☁️ Multi-user support

## Troubleshooting

### "npm is not recognized"
- You need to install Node.js (see Step 1)
- After installation, restart your terminal

### "Module not found" errors
- Run: `npm install` to install all dependencies

### AI features not working
- Check that you have a valid Gemini API key in `.env.local`
- The key must start with `VITE_GEMINI_API_KEY=`
- Restart the dev server after creating `.env.local`

### Port 3000 already in use
- Change the port in `vite.config.ts`: `port: 3001`
- Or stop any other app using port 3000

## Project Structure

```
FinanceCS/
├── App.tsx                 # Main app component
├── index.tsx              # Entry point
├── index.html             # HTML template
├── types.ts               # TypeScript types
├── components/            # UI components
│   ├── AIInsights.tsx     # AI-powered insights
│   ├── Auth.tsx           # Authentication
│   ├── Charts.tsx         # Data visualizations
│   ├── Documents.tsx      # Document management
│   ├── Portfolio.tsx      # Investment portfolio
│   ├── Settings.tsx       # App settings
│   └── UIComponents.tsx   # Reusable UI components
├── services/              # Business logic
│   ├── geminiService.ts   # AI integration (FIXED)
│   ├── storageService.ts  # Data persistence
│   ├── idbService.ts      # IndexedDB wrapper
│   ├── cloudService.ts    # Firebase integration
│   └── yahooFinanceService.ts # Stock data (mocked)
├── package.json           # Dependencies
├── vite.config.ts         # Vite configuration (FIXED)
└── .env.local            # Environment variables (CREATE THIS)
```

## Need Help?

If you encounter any issues:
1. Check that Node.js is installed: `node --version`
2. Check that dependencies are installed: `npm list`
3. Check the browser console for errors (F12)
4. Ensure `.env.local` exists and has your API key
5. Try clearing browser cache and restarting the dev server

