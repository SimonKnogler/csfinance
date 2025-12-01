let rateCache = null;

const sendJSON = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    sendJSON(res, 200, { ok: true });
    return;
  }

  const from = (req.query.from || 'USD').toString().toUpperCase();
  const to = (req.query.to || 'EUR').toString().toUpperCase();

  try {
    const now = Date.now();

    if (rateCache && rateCache.expires > now) {
      const cachedRate = rateCache.rates[`${from}_${to}`];
      if (cachedRate) {
        sendJSON(res, 200, { from, to, rate: cachedRate });
        return;
      }
    }

    const response = await fetch(`https://open.er-api.com/v6/latest/${from}`);
    if (!response.ok) {
      sendJSON(res, response.status, { error: `Failed to fetch rates: ${response.status}` });
      return;
    }

    const data = await response.json();
    const rates = data?.rates;
    if (!rates || typeof rates !== 'object') {
      sendJSON(res, 404, { error: 'Invalid rate data' });
      return;
    }

    const cacheData = {};
    for (const currency in rates) {
      cacheData[`${from}_${currency}`] = rates[currency];
    }
    rateCache = { rates: cacheData, expires: now + 60 * 60 * 1000 };

    const rate = rates[to];
    if (typeof rate !== 'number') {
      sendJSON(res, 404, { error: 'Rate not found' });
      return;
    }

    sendJSON(res, 200, { from, to, rate });
  } catch (error) {
    console.error(`Error fetching exchange rate ${from} -> ${to}:`, error);
    sendJSON(res, 500, { error: 'Failed to fetch exchange rate' });
  }
};

