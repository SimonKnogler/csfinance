const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

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

export default async function handler(req, res) {
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

  const interval = getIntervalForRange(range);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;

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
      sendJSON(res, response.status, { error: `Yahoo Finance API error: ${response.status}` });
      return;
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];

    if (!result) {
      console.warn(`No chart data returned for ${symbol} from Yahoo Finance`);
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
        const dateStr = interval.includes('m') || interval.includes('h')
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
    const errorMsg = error?.message || String(error);
    console.error(`Error fetching stock history for ${symbol}:`, errorMsg, error?.stack);
    sendJSON(res, 500, { 
      error: 'Failed to fetch stock history',
      details: errorMsg,
      symbol: symbol,
    });
  }
};

