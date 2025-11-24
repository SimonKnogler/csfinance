const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const sendJSON = (res, statusCode, payload) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

const fetchYahooJson = async (url) => {
  // Serverless functions don't need CORS proxies - call Yahoo directly
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Yahoo Finance API error: HTTP ${response.status}`);
  }
  
  const text = await response.text();
  if (!text) {
    throw new Error('Yahoo Finance returned empty response');
  }
  
  return JSON.parse(text);
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    sendJSON(res, 200, { ok: true });
    return;
  }

  const symbol = (req.query.symbol || '').toString().trim();

  if (!symbol) {
    sendJSON(res, 400, { error: 'Symbol required' });
    return;
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?interval=1d&range=1d`;
    const data = await fetchYahooJson(url);
    const result = data?.chart?.result?.[0];

    if (!result) {
      sendJSON(res, 404, { error: 'No data returned' });
      return;
    }

    const price = result.meta?.regularMarketPrice;
    const currency = result.meta?.currency || 'USD';
    const exchange = result.meta?.exchangeName || '';

    if (typeof price !== 'number') {
      sendJSON(res, 404, { error: 'Invalid price data' });
      return;
    }

    const quoteJson = await fetchYahooJson(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`
    );
    const quote = quoteJson?.quoteResponse?.result?.[0];
    const changePercent = quote ? Number(quote.regularMarketChangePercent ?? 0) : 0;
    const name = quote?.longName || quote?.shortName || symbol.toUpperCase();

    sendJSON(res, 200, {
      symbol: symbol.toUpperCase(),
      price,
      currency: currency.toUpperCase(),
      timestamp: Date.now(),
      exchange,
      changePercent,
      name,
    });
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    sendJSON(res, 500, { error: 'Failed to fetch stock price' });
  }
};

