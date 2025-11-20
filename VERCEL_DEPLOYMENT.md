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

### 1. API Proxies Won't Work in Production

The Vite dev proxy we use for Yahoo Finance and CoinGecko **only works locally**.

**On Vercel, you'll see CORS errors** for:
- Yahoo Finance API calls
- CoinGecko API calls

**Solution Options:**

#### Option A: Use Serverless Functions (Recommended)

Create API routes in Vercel to proxy the requests:

1. Create `/api` folder in your project
2. Add serverless functions for each API
3. Update your code to call `/api/yahoo` instead of direct Yahoo URLs

I can help you set this up if needed!

#### Option B: Use a Third-Party Proxy Service

- Use services like `cors-anywhere` or similar
- Not recommended for production (unreliable)

#### Option C: Local-Only Mode

- Keep the app as-is
- Users must run `npm run dev` locally
- Good for personal use only

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
- Likely CORS issues with APIs (see API Proxy section above)

### Environment Variables Not Working

**Error**: `import.meta.env.VITE_XXX is undefined`
- **Fix**: Make sure environment variables start with `VITE_`
- Redeploy after adding env vars

---

## 📝 Next Steps

Once deployed, you should:

1. ✅ Test the app thoroughly on the live URL
2. ✅ Set up API proxies if you see CORS errors
3. ✅ Configure Firebase for cloud sync (optional)
4. ✅ Add a custom domain (optional)
5. ✅ Enable HTTPS (automatic on Vercel)

---

## 🆘 Need Help?

If you encounter issues:

1. Check Vercel deployment logs (click on deployment → "View Function Logs")
2. Check browser console (F12) for errors
3. Try the "Redeploy" button in Vercel
4. Contact me for serverless API setup assistance

---

**Ready to deploy?** Follow the steps above and let me know if you need help!

