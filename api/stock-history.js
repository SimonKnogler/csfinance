const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const YAHOO_PROXIES = [
  { prefix: '', encode: false },
  { prefix: 'https://stuff.mufeedvh.com/https://', encode: false },
  { prefix: 'https://api.allorigins.win/raw?url=', encode: true },
  { prefix: 'https://cors.isomorphic-git.org/', encode: false },
  { prefix: 'https://thingproxy.freeboard.io/fetch/', encode: false },
  { prefix: 'https://corsproxy.io/?', encode: true },
];

const sendJSON = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

const getIntervalForRange = (range) => {
  switch (range) {
    case '1d':
      return '5m';
    case '5d':
      return '15m';
    case '1mo':
      return '1h';
    case '6mo':
      return '1d';
    case '1y':
      return '1d';
    case '5y':
      return '1wk';
    case 'max':
      return '1mo';
    default:
      return '1d';
  }
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
  throw new Error(`Yahoo Finance request failed via all proxies: ${attempts.join(' | ')}`);
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
  const range = (req.query.range || '1mo').toString();

  if (!symbol) {
    sendJSON(res, 400, { error: 'Symbol required' });
    return;
  }

  try {
    const interval = getIntervalForRange(range);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?range=${range}&interval=${interval}`;
    const data = await fetchYahooJson(url);
    const result = data?.chart?.result?.[0];

    if (!result) {
      sendJSON(res, 404, { error: 'No data returned' });
      return;
    }

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const closes = quotes.close || [];
    const opens = quotes.open || [];
    const highs = quotes.high || [];
    const lows = quotes.low || [];
    const volumes = quotes.volume || [];

    const chartData = timestamps
      .map((ts, idx) => {
        const date = new Date(ts * 1000);
        const dateStr =
          interval.includes('m') || interval.includes('h')
            ? date.toISOString().slice(0, 16).replace('T', ' ')
            : date.toISOString().split('T')[0];

        return {
          date: dateStr,
          timestamp: ts,
          close: closes[idx],
          open: opens[idx],
          high: highs[idx],
          low: lows[idx],
          volume: volumes[idx],
        };
      })
      .filter((point) => point.close !== null && point.close !== undefined);

    const currency = result.meta?.currency || 'USD';

    sendJSON(res, 200, {
      symbol: symbol.toUpperCase(),
      currency: currency.toUpperCase(),
      data: chartData,
    });
  } catch (error) {
    console.error(`Error fetching history for ${symbol}:`, error);
    sendJSON(res, 500, { error: 'Failed to fetch stock history' });
  }
};

