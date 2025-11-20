const sendJSON = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

const SYMBOL_MAP = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
  USDC: 'usd-coin',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  UNI: 'uniswap',
  LTC: 'litecoin',
  ATOM: 'cosmos',
  ETC: 'ethereum-classic',
  XLM: 'stellar',
  ALGO: 'algorand',
  VET: 'vechain',
  ICP: 'internet-computer',
};

const RANGE_DAYS = {
  '1d': '1',
  '5d': '5',
  '1mo': '30',
  '6mo': '180',
  '1y': '365',
  '5y': '1825',
  max: 'max',
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
  const range = (req.query.range || '30').toString();

  if (!symbol) {
    sendJSON(res, 400, { error: 'Symbol required' });
    return;
  }

  const coinId = SYMBOL_MAP[symbol.toUpperCase()] || symbol.toLowerCase();
  const days = RANGE_DAYS[range] || range;
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=eur&days=${days}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      sendJSON(res, response.status, { error: 'Failed to fetch data' });
      return;
    }

    const data = await response.json();
    const prices = data?.prices || [];

    if (!prices.length) {
      sendJSON(res, 404, { error: 'No historical data available' });
      return;
    }

    const chartData = prices.map(([timestamp, price]) => ({
      date: new Date(timestamp).toISOString().split('T')[0],
      timestamp: Math.floor(timestamp / 1000),
      close: price,
      open: price,
      high: price,
      low: price,
      volume: 0,
    }));

    sendJSON(res, 200, {
      symbol: symbol.toUpperCase(),
      currency: 'EUR',
      data: chartData,
      source: 'coingecko',
    });
  } catch (error) {
    console.error(`Error fetching crypto history for ${symbol}:`, error);
    sendJSON(res, 500, { error: 'Failed to fetch crypto history' });
  }
};

