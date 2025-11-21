const sendJSON = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

const toYahooSymbol = (symbol) => {
  const upper = symbol.toUpperCase();
  if (upper.includes('-')) return upper;
  return `${upper}-USD`;
};

const fetchFromBinance = async (symbol) => {
  const base = symbol.toUpperCase().replace('-USD', '');
  const pair = `${base}USDT`;
  const tickerUrl = `https://api.binance.com/api/v3/ticker/24hr?symbol=${pair}`;

  const tickerResponse = await fetch(tickerUrl, { headers: { Accept: 'application/json' } });

  if (!tickerResponse.ok) {
    throw new Error(`Binance ticker request failed: ${tickerResponse.status}`);
  }

  const ticker = await tickerResponse.json();
  if (!ticker || typeof ticker.lastPrice === 'undefined') {
    throw new Error('Binance ticker returned no data');
  }

  const priceUSDT = Number(ticker.lastPrice);
  const changePercent = Number(ticker.priceChangePercent ?? 0);
  const exchange = ticker.lastId ? 'Binance' : 'Binance';

  // Convert USDT to EUR using EURUSDT pair (1 EUR in USDT)
  let price = priceUSDT;
  let currency = 'USDT';
  try {
    const eurTicker = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT', { headers: { Accept: 'application/json' } });
    if (eurTicker.ok) {
      const { price: eurPrice } = await eurTicker.json();
      const eurUsdt = Number(eurPrice);
      if (eurUsdt > 0) {
        price = priceUSDT / eurUsdt;
        currency = 'EUR';
      }
    }
  } catch (error) {
    // silently fall back to USDT
  }

  return {
    symbol: symbol.toUpperCase(),
    price,
    currency,
    timestamp: Date.now(),
    changePercent,
    exchange,
    name: base,
    source: 'Binance',
  };
};

const fetchFromCryptoCompare = async (symbol) => {
  const base = symbol.toUpperCase().replace('-USD', '');
  const url = `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${base}&tsyms=EUR`;

  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`CryptoCompare request failed: ${response.status}`);
  }

  const data = await response.json();
  const raw = data?.RAW?.[base]?.EUR;
  const display = data?.DISPLAY?.[base]?.EUR;

  if (!raw?.PRICE) {
    throw new Error('CryptoCompare returned no price data');
  }

  return {
    symbol: symbol.toUpperCase(),
    price: Number(raw.PRICE),
    currency: 'EUR',
    timestamp: (raw.LASTUPDATE || Math.floor(Date.now() / 1000)) * 1000,
    changePercent: Number(raw.CHANGEPCT24HOUR ?? raw.CHANGEPCTDAY ?? 0),
    exchange: raw.MARKET || 'CryptoCompare',
    name: display?.FROMSYMBOL || symbol.toUpperCase(),
    source: 'CryptoCompare',
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
    const payload = await fetchFromBinance(yahooSymbol);
    sendJSON(res, 200, payload);
    return;
  } catch (error) {
    console.warn(`Binance crypto price failed for ${rawSymbol}:`, error.message);
  }

  try {
    const fallbackPayload = await fetchFromCryptoCompare(yahooSymbol);
    sendJSON(res, 200, fallbackPayload);
  } catch (error) {
    console.error(`CryptoCompare fallback price failed for ${rawSymbol}:`, error.message);
    sendJSON(res, 500, { error: 'Failed to fetch crypto price', symbol: rawSymbol.toUpperCase() });
  }
};

