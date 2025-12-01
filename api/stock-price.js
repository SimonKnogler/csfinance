const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const sendJSON = (res, statusCode, payload) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
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

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`Yahoo Finance API error for ${symbol}: ${response.status} - ${errorText}`);
      sendJSON(res, response.status, { error: `Failed to fetch: ${response.status}`, details: errorText });
      return;
    }

    const data = await response.json();
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

    const controller2 = new AbortController();
    const timeoutId2 = setTimeout(() => controller2.abort(), 10000);

    const quoteResponse = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
      signal: controller2.signal,
    });

    clearTimeout(timeoutId2);

    let changePercent = 0;
    let name = symbol.toUpperCase();

    if (quoteResponse.ok) {
      const quoteJson = await quoteResponse.json();
      const quote = quoteJson?.quoteResponse?.result?.[0];
      if (quote) {
        changePercent = Number(quote.regularMarketChangePercent ?? 0);
        name = quote.longName || quote.shortName || name;
      }
    }

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
    const errorMsg = error?.message || String(error);
    console.error(`Error fetching stock price for ${symbol}:`, errorMsg, error?.stack);
    sendJSON(res, 500, { 
      error: 'Failed to fetch stock price',
      details: errorMsg,
      symbol: symbol,
    });
  }
};

