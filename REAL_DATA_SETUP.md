# Real Stock Data (Yahoo-only) 🚀

FinanceCS now fetches every quote and price series directly from
**Yahoo Finance**. There are no API keys or third-party vendors to
configure—the entire pipeline lives in `services/yahooFinanceService.ts`.

---

## 🔧 How the New Pipeline Works

1. We call `https://query1.finance.yahoo.com/v7/finance/quote` for
   current prices.
2. Price charts come from
   `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}`.
3. Each request is attempted through several public CORS-safe proxies
   (AllOrigins, ThingProxy, corsproxy.io, direct). The first one that
   returns valid JSON wins.
4. The UI shows “Source: Yahoo Finance” next to the stock chart along
   with the last refresh timestamp.

If Yahoo responds with malformed or empty data, the chart simply shows
an error instead of fake/simulated lines.

---

## ✅ What You Need to Configure

Nothing. Just run the app:

```bash
npm install
npm run dev -- --port 3001
```

Then open `http://localhost:3001`, go to **Portfolio**, click any stock,
and you’ll see real Yahoo data.

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

1. Open DevTools → Network tab. You should see calls to
   `query1.finance.yahoo.com`.
2. Compare the chart with Yahoo’s public site – timestamps and prices
   should match.
3. Watch the console for messages like “Yahoo Finance request failed via
   all proxies” if something blocks the fetch.

---

## 🌐 Customizing Proxies

Some enterprise networks/VPNs block public proxy hosts. If the chart
fails to load, edit `YAHOO_PROXY_ENDPOINTS` in
`services/yahooFinanceService.ts` and add your own endpoint, for example:

```ts
const YAHOO_PROXY_ENDPOINTS = [
  { prefix: 'https://your-company-proxy.example/fetch/', encode: false },
  { prefix: '', encode: false }, // direct fallback
];
```

Restart the dev server after editing.

---

## 🧰 Troubleshooting

| Symptom | Fix |
| --- | --- |
| Chart shows “Unable to load Yahoo Finance data.” | Check DevTools console for the exact proxy that failed. Add/replace proxies as described above. |
| Prices look stale | Perform a hard refresh (Ctrl+Shift+R). Yahoo occasionally caches aggressively per IP. |
| Quotes fail when adding a new holding | The Yahoo API couldn’t find that symbol. Confirm the ticker on finance.yahoo.com. |

---

## 📚 Need Offline Data?

If you ever need a demo without internet access, temporarily replace
`fetchYahooJson` inside `services/yahooFinanceService.ts` with a function
that returns static JSON, or mock the response in `loadHoldingHistory`.

---

Yahoo-only integration keeps things simple, free, and maintenance-light.
Enjoy the real charts! 📈

