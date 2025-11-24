const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const YAHOO_PROXIES = [
  { prefix: '', encode: false },
  { prefix: 'https://api.allorigins.win/raw?url=', encode: true },
  { prefix: 'https://thingproxy.freeboard.io/fetch/', encode: false },
  { prefix: 'https://cors.isomorphic-git.org/', encode: false },
];

const sendJSON = (res, statusCode, payload) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

const fetchYahooJson = async (url) => {
  const attempts = [];
  for (const proxy of YAHOO_PROXIES) {
    const proxiedUrl = proxy.prefix ? `${proxy.prefix}${proxy.encode ? encodeURIComponent(url) : url}` : url;
    try {
      const response = await fetch(proxiedUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
        },
      });
      if (!response.ok) {
        attempts.push(`${proxiedUrl} → HTTP ${response.status}`);
        continue;
      }
      const text = await response.text();
      if (!text) {
        attempts.push(`${proxiedUrl} → empty body`);
        continue;
      }
      try {
        return JSON.parse(text);
      } catch (err) {
        attempts.push(`${proxiedUrl} → JSON parse error ${err.message}`);
      }
    } catch (error) {
      attempts.push(`${proxiedUrl} → ${(error && error.message) || 'network error'}`);
    }
  }
  throw new Error(`Yahoo Finance price request failed via all proxies: ${attempts.join(' | ')}`);
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

