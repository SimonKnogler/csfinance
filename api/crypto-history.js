const sendJSON = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

const RANGE_CONFIG = {
  '1d': { interval: '5m', limit: 288 },
  '5d': { interval: '30m', limit: 240 },
  '1mo': { interval: '1h', limit: 720 },
  '6mo': { interval: '4h', limit: 1080 },
  '1y': { interval: '1d', limit: 365 },
  '5y': { interval: '1d', limit: 1825 },
  max: { interval: '1d', limit: 2000 },
};

const COINGECKO_RANGE_MAP = {
  '1d': 1,
  '5d': 5,
  '1mo': 30,
  '6mo': 180,
  '1y': 365,
  '5y': 1825,
  max: 'max',
};

const toBaseSymbol = (symbol) => symbol.toUpperCase().split('-')[0];
const toBinancePairs = (symbol) => {
  const base = toBaseSymbol(symbol);
  return [`${base}EUR`, `${base}USDT`, `${base}BUSD`];
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

  const config = RANGE_CONFIG[range] || RANGE_CONFIG['1mo'];
  const pairs = toBinancePairs(symbol);

  try {
    let candles = null;
    let priceCurrency = 'EUR';
    for (const pair of pairs) {
      const params = new URLSearchParams({
        symbol: pair,
        interval: config.interval,
        limit: String(config.limit),
      });
      const url = `https://api.binance.com/api/v3/klines?${params.toString()}`;
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) continue;
      const data = await response.json();
      if (Array.isArray(data) && data.length) {
        candles = data;
        if (pair.endsWith('EUR')) priceCurrency = 'EUR';
        else if (pair.endsWith('USDT')) priceCurrency = 'USDT';
        else priceCurrency = pair.slice(-4);
        break;
      }
    }

    if (!candles) {
      throw new Error('Binance klines unavailable');
    }

    let eurRate = 1;
    let currency = priceCurrency;
    if (currency !== 'EUR') {
      const convertPair = currency === 'USDT' ? 'EURUSDT' : currency === 'BUSD' ? 'EURBUSD' : null;
      if (convertPair) {
        try {
          const eurTicker = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${convertPair}`, { headers: { Accept: 'application/json' } });
          if (eurTicker.ok) {
            const { price: eurPrice } = await eurTicker.json();
            const rate = Number(eurPrice);
            if (rate > 0) {
              eurRate = rate;
              currency = 'EUR';
            }
          }
        } catch (error) {
          // keep original currency
        }
      }
    }

    const chartData = candles.map(candle => {
      const [
        openTime,
        open,
        high,
        low,
        close,
        volume,
      ] = candle;

      const openNum = Number(open);
      const highNum = Number(high);
      const lowNum = Number(low);
      const closeNum = Number(close);

      const convert = (num) => currency === 'EUR' && priceCurrency !== 'EUR' ? num / eurRate : num;

      return {
        date: new Date(openTime).toISOString().split('T')[0],
        timestamp: Math.floor(openTime / 1000),
        open: convert(openNum),
        high: convert(highNum),
        low: convert(lowNum),
        close: convert(closeNum),
        volume: Number(volume),
      };
    });

    sendJSON(res, 200, {
      symbol: symbol.toUpperCase(),
      currency,
      data: chartData,
      source: 'Binance',
    });
  } catch (error) {
    console.warn(`Binance history failed for ${symbol}:`, error?.message || error);

    // Fallback to CryptoCompare
    try {
      const days = COINGECKO_RANGE_MAP[range] ?? 30;
      const base = toBaseSymbol(symbol).toLowerCase();
      const url = `https://api.coingecko.com/api/v3/coins/${base}/market_chart?vs_currency=eur&days=${days}`;
      const resp = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!resp.ok) {
        throw new Error(`CoinGecko history fallback failed: ${resp.status}`);
      }

      const payload = await resp.json();
      const prices = payload?.prices || [];
      if (!prices.length) {
        throw new Error('CoinGecko history returned empty data');
      }

      const fallbackData = prices.map(([timestamp, price]) => ({
        date: new Date(timestamp).toISOString().split('T')[0],
        timestamp: Math.floor(timestamp / 1000),
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 0,
      }));

      sendJSON(res, 200, {
        symbol: symbol.toUpperCase(),
        currency: 'EUR',
        data: fallbackData,
        source: 'CoinGecko',
      });
    } catch (fallbackError) {
      console.error(`Error fetching crypto history for ${symbol}:`, fallbackError);
      sendJSON(res, 500, { error: 'Failed to fetch crypto history' });
    }
  }
};

