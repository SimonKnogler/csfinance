# Real Stock Data (Yahoo-only) 🚀

FinanceCS now fetches every quote and price series directly from
**Yahoo Finance** through **serverless API routes**. There are no API keys or third-party vendors to
configure—the backend API handles all Yahoo Finance requests.

---

## 🔧 How the New Pipeline Works

1. **Frontend** (`services/yahooFinanceService.ts`) calls serverless API routes:
   - `/api/stock-price` for current stock prices
   - `/api/stock-history` for historical price charts
   - `/api/stock-metadata` for company information
   - `/api/crypto-price` and `/api/crypto-history` for cryptocurrency data

2. **Backend** (serverless functions in `api/` directory) call Yahoo Finance directly:
   - No CORS issues since they run server-side
   - Yahoo Finance endpoints: `query1.finance.yahoo.com` and `query2.finance.yahoo.com`
   - Crypto data from Binance and CoinGecko APIs

3. The UI shows "Source: Yahoo Finance" next to the stock chart along
   with the last refresh timestamp.

**Important**: CORS proxies have been completely removed. All Yahoo Finance calls now go through the serverless API routes to avoid CORS errors in production.

---

## ✅ What You Need to Configure

### For Local Development:

```bash
npm install
npm run dev
```

The Vite dev server includes proxy configuration that forwards API calls to Yahoo Finance.

### For Production (Vercel):

Deploy to Vercel - the serverless functions in the `api/` directory will automatically handle all Yahoo Finance requests:

```bash
vercel deploy
```

---

## 📦 `.env.local` Example

```
VITE_GEMINI_API_KEY=your_optional_key
# Firebase overrides go here only if you want to change the bundled config.
```

There are **no** `VITE_FINNHUB_*` or `VITE_ALPHAVANTAGE_*` variables
anymore.

---

## 🔍 Verification Checklist

1. Open DevTools → Network tab. You should see calls to `/api/stock-price`, `/api/stock-history`, etc.
2. The serverless functions will call Yahoo Finance directly (no CORS issues).
3. Compare the chart with Yahoo's public site – timestamps and prices
   should match.

---

## 🌐 Architecture Notes

**No more CORS proxy configuration needed!** The old system tried to use multiple public CORS proxies (AllOrigins, ThingProxy, etc.) which were unreliable and often blocked.

The new architecture:
- **Frontend → Serverless API Routes → Yahoo Finance**
- All API calls go through backend serverless functions (no CORS issues!)
- Local development uses Vite's built-in proxy (configured in `vite.config.ts`)
- Production deployment uses Vercel serverless functions (automatically deployed from `api/` directory)

---

## 🧰 Troubleshooting

| Symptom | Fix |
| --- | --- |
| Chart shows "Failed to fetch stock history" | Ensure serverless functions are deployed. Check Vercel deployment logs. |
| Prices look stale | Perform a hard refresh (Ctrl+Shift+R). Caching is set to 1 minute for prices, 15 minutes for history. |
| Quotes fail when adding a new holding | The Yahoo API couldn't find that symbol. Confirm the ticker on finance.yahoo.com. |
| API routes returning 500 errors | Check if Yahoo Finance is accessible from your server. Some cloud providers may block financial APIs. |

---

## 📚 Need Offline Data?

If you need a demo without internet access, you can mock the API responses by creating test fixtures in your development environment.

---

Yahoo-only integration through serverless APIs keeps things simple, free, and maintenance-light.
Enjoy the real charts! 📈

