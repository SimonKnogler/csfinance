# Vercel Deployment Guide

## 📋 Prerequisites

1. GitHub Account
2. Vercel Account (sign up at https://vercel.com)
3. Your project code

---

## 🚀 Step-by-Step Deployment

### Step 1: Push to GitHub

1. **Create a new GitHub repository**
   - Go to https://github.com/new
   - Name: `novafinance` (or any name you prefer)
   - Visibility: Private (recommended for personal finance app)
   - Click "Create repository"

2. **Initialize Git and push (if not already done)**
   
   Open your terminal in the project folder:

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/novafinance.git
   git push -u origin main
   ```

   Replace `YOUR_USERNAME` with your actual GitHub username.

---

### Step 2: Import to Vercel

1. **Go to Vercel**
   - Visit https://vercel.com
   - Click "Sign Up" or "Log In"
   - Choose "Continue with GitHub"

2. **Import Project**
   - Click "Add New..." → "Project"
   - You'll see your GitHub repositories
   - Find your `novafinance` repository
   - Click "Import"

3. **Configure Project**
   - **Project Name**: `novafinance` (or customize)
   - **Framework Preset**: Vite (should auto-detect)
   - **Root Directory**: `./` (leave as is)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Environment Variables** (Optional)
   
   Click "Environment Variables" and add:
   
   | Name | Value |
   |------|-------|
   | `VITE_GEMINI_API_KEY` | Your Gemini API key (if using AI features) |
   | `VITE_FIREBASE_API_KEY` | Your Firebase API key (if using cloud sync) |
   | `VITE_FIREBASE_AUTH_DOMAIN` | Your Firebase auth domain |
   | `VITE_FIREBASE_PROJECT_ID` | Your Firebase project ID |

   **Note**: For a local-only version, you can skip these environment variables.

5. **Deploy**
   - Click "Deploy"
   - Wait 1-2 minutes for the build to complete
   - ✅ Your app is now live!

---

### Step 3: Access Your App

Once deployed, you'll get a URL like:
- `https://novafinance.vercel.app`
- or `https://novafinance-your-username.vercel.app`

---

## 🔧 Important: Production Considerations

### 1. ✅ Serverless API Functions Already Configured!

This project **already includes serverless API functions** in the `/api` directory that handle all Yahoo Finance and cryptocurrency API calls. **No CORS configuration needed!**

The serverless functions will automatically deploy to Vercel and handle:
- Stock price quotes (`/api/stock-price`)
- Historical price data (`/api/stock-history`)
- Stock metadata (`/api/stock-metadata`)
- Cryptocurrency prices (`/api/crypto-price`)
- Cryptocurrency history (`/api/crypto-history`)
- Exchange rates (`/api/exchange-rate`)

**How it works:**
- **Local development**: Vite proxy forwards requests to Yahoo Finance
- **Production (Vercel)**: Serverless functions call Yahoo Finance directly (no CORS issues!)

**No additional configuration required!** Just deploy and it works.

---

## 🔄 Automatic Deployments

Every time you push to GitHub, Vercel will automatically rebuild and redeploy:

```bash
git add .
git commit -m "Update features"
git push
```

Vercel will detect the push and deploy automatically within 1-2 minutes.

---

## 🌐 Custom Domain (Optional)

1. Go to your project on Vercel
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions
5. Wait for DNS propagation (up to 48 hours)

---

## 🐛 Troubleshooting

### Build Fails

**Error**: `npm ERR! code ELIFECYCLE`
- **Fix**: Check `package.json` scripts are correct
- Make sure all dependencies are in `package.json`

### Blank Page After Deploy

**Error**: White screen, no content
- **Fix**: Check browser console for errors
- Check Vercel function logs for API errors
- Ensure serverless functions deployed correctly (check Vercel dashboard)

### Environment Variables Not Working

**Error**: `import.meta.env.VITE_XXX is undefined`
- **Fix**: Make sure environment variables start with `VITE_`
- Redeploy after adding env vars

---

## 📝 Next Steps

Once deployed, you should:

1. ✅ Test the app thoroughly on the live URL
2. ✅ Verify stock data loads correctly (serverless functions working)
3. ✅ Configure Firebase for cloud sync (optional)
4. ✅ Add a custom domain (optional)
5. ✅ Enable HTTPS (automatic on Vercel)

---

## 🆘 Need Help?

If you encounter issues:

1. Check Vercel deployment logs (click on deployment → "View Function Logs")
2. Check browser console (F12) for errors
3. Verify serverless functions are deployed (Vercel dashboard → Functions tab)
4. Try the "Redeploy" button in Vercel
5. Check if Yahoo Finance is accessible from Vercel's servers (some regions may be blocked)

---

**Ready to deploy?** Follow the steps above and let me know if you need help!

