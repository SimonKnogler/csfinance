const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

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

const toYahooSymbol = (symbol) => {
  const upper = symbol.toUpperCase();
  if (upper.includes('-')) return upper;
  return `${upper}-USD`;
};

const fetchFromYahoo = async (symbol) => {
  const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const chartResponse = await fetch(chartUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json',
    },
  });

  if (!chartResponse.ok) {
    throw new Error(`Yahoo chart request failed: ${chartResponse.status}`);
  }

  const chartJson = await chartResponse.json();
  const result = chartJson?.chart?.result?.[0];
  if (!result) {
    throw new Error('Yahoo chart returned no result');
  }

  const price = result.meta?.regularMarketPrice;
  if (typeof price !== 'number') {
    throw new Error('Yahoo chart returned invalid price');
  }

  const quoteUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
  const quoteResponse = await fetch(quoteUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json',
    },
  });

  let changePercent = 0;
  let name = symbol.toUpperCase();
  let exchange = result.meta?.exchangeName || '';

  if (quoteResponse.ok) {
    const quoteJson = await quoteResponse.json();
    const quote = quoteJson?.quoteResponse?.result?.[0];
    if (quote) {
      changePercent = Number(quote.regularMarketChangePercent ?? 0);
      name = quote.longName || quote.shortName || name;
      exchange = quote.fullExchangeName || exchange;
    }
  }

  return {
    symbol: symbol.toUpperCase(),
    price,
    currency: (result.meta?.currency || 'USD').toUpperCase(),
    timestamp: Date.now(),
    changePercent,
    exchange: exchange || 'Yahoo Finance',
    name,
    source: 'Yahoo Finance',
  };
};

const fetchFromCoinGecko = async (symbol) => {
  const base = symbol.toUpperCase().replace('-USD', '');
  const coinGeckoId = COINGECKO_IDS[base] || symbol.toLowerCase();
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoId}&vs_currencies=eur&include_24hr_change=true`;

  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`CoinGecko request failed: ${response.status}`);
  }

  const data = await response.json();
  const record = data[coinGeckoId];
  if (!record?.eur) {
    throw new Error('CoinGecko returned no price data');
  }

  return {
    symbol: symbol.toUpperCase(),
    price: record.eur,
    currency: 'EUR',
    timestamp: Date.now(),
    changePercent: record.eur_24h_change || record.usd_24h_change || 0,
    exchange: 'CoinGecko',
    name: symbol.toUpperCase(),
    source: 'CoinGecko',
  };
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

  const rawSymbol = (req.query.symbol || '').toString().trim();
  if (!rawSymbol) {
    sendJSON(res, 400, { error: 'Symbol required' });
    return;
  }

  const yahooSymbol = toYahooSymbol(rawSymbol);

  try {
    const payload = await fetchFromCoinGecko(yahooSymbol);
    sendJSON(res, 200, payload);
    return;
  } catch (error) {
    console.warn(`CoinGecko crypto price failed for ${rawSymbol}:`, error.message);
  }

  try {
    const fallbackPayload = await fetchFromYahoo(yahooSymbol);
    sendJSON(res, 200, fallbackPayload);
  } catch (error) {
    console.error(`Yahoo crypto price failed for ${yahooSymbol}:`, error.message);
    sendJSON(res, 500, { error: 'Failed to fetch crypto price', symbol: rawSymbol.toUpperCase() });
  }
};

