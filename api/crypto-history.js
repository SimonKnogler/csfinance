const sendJSON = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

const RANGE_CONFIG = {
  '1d': { endpoint: 'histominute', limit: 288, aggregate: 5 },     // 24h at 5m
  '5d': { endpoint: 'histohour', limit: 120, aggregate: 1 },        // 5d hourly
  '1mo': { endpoint: 'histohour', limit: 720, aggregate: 1 },       // 30d hourly
  '6mo': { endpoint: 'histoday', limit: 180, aggregate: 1 },        // 6 months daily
  '1y': { endpoint: 'histoday', limit: 365, aggregate: 1 },
  '5y': { endpoint: 'histoday', limit: 1825, aggregate: 1 },
  max: { endpoint: 'histoday', limit: 2000, aggregate: 1 },
};

const toBaseSymbol = (symbol) => symbol.toUpperCase().replace('-USD', '');

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
  const range = (req.query.range || '30').toString();

  if (!symbol) {
    sendJSON(res, 400, { error: 'Symbol required' });
    return;
  }

  const base = toBaseSymbol(symbol);
  const config = RANGE_CONFIG[range] || RANGE_CONFIG['1mo'];
  const params = new URLSearchParams({
    fsym: base,
    tsym: 'EUR',
    limit: String(config.limit),
  });
  if (config.aggregate && config.aggregate > 1) {
    params.set('aggregate', String(config.aggregate));
  }
  const url = `https://min-api.cryptocompare.com/data/v2/${config.endpoint}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      sendJSON(res, response.status, { error: 'Failed to fetch data' });
      return;
    }

    const payload = await response.json();
    const prices = payload?.Data?.Data || [];

    if (!prices.length) {
      sendJSON(res, 404, { error: 'No historical data available' });
      return;
    }

    const chartData = prices.map(point => ({
      date: new Date(point.time * 1000).toISOString().split('T')[0],
      timestamp: point.time,
      close: point.close,
      open: point.open,
      high: point.high,
      low: point.low,
      volume: point.volumefrom ?? 0,
    }));

    sendJSON(res, 200, {
      symbol: symbol.toUpperCase(),
      currency: 'EUR',
      data: chartData,
      source: 'CryptoCompare',
    });
  } catch (error) {
    console.error(`Error fetching crypto history for ${symbol}:`, error);
    sendJSON(res, 500, { error: 'Failed to fetch crypto history' });
  }
};

