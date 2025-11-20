const sendJSON = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

const COINGECKO_IDS = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  BNB: 'binancecoin',
  USDC: 'usd-coin',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  SOL: 'solana',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  LTC: 'litecoin',
  AVAX: 'avalanche-2',
  LINK: 'chainlink',
  UNI: 'uniswap',
  ATOM: 'cosmos',
  XLM: 'stellar',
  ALGO: 'algorand',
  VET: 'vechain',
  ICP: 'internet-computer',
  ETC: 'ethereum-classic',
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

  const upper = symbol.toUpperCase();
  const coinGeckoId = COINGECKO_IDS[upper] || symbol.toLowerCase();
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoId}&vs_currencies=eur&include_24hr_change=true`;

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      sendJSON(res, response.status, { error: 'Crypto not found', symbol: upper });
      return;
    }

    const data = await response.json();
    if (!data[coinGeckoId]?.eur) {
      sendJSON(res, 404, { error: 'No price data available', symbol: upper });
      return;
    }

    sendJSON(res, 200, {
      symbol: upper,
      price: data[coinGeckoId].eur,
      currency: 'EUR',
      timestamp: Date.now(),
      change24h: data[coinGeckoId].eur_24h_change || 0,
      source: 'coingecko',
    });
  } catch (error) {
    console.error(`Error fetching crypto price for ${symbol}:`, error);
    sendJSON(res, 500, { error: 'Failed to fetch crypto price', symbol: upper });
  }
};

