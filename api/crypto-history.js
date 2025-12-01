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

const toBaseSymbol = (symbol) => symbol.toUpperCase().replace('-USD', '');
const toBinancePair = (symbol) => `${toBaseSymbol(symbol)}USDT`;

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
  const range = (req.query.range || '30').toString();

  if (!symbol) {
    sendJSON(res, 400, { error: 'Symbol required' });
    return;
  }

  const pair = toBinancePair(symbol);
  const config = RANGE_CONFIG[range] || RANGE_CONFIG['1mo'];
  const params = new URLSearchParams({
    symbol: pair,
    interval: config.interval,
    limit: String(config.limit),
  });

  const url = `https://api.binance.com/api/v3/klines?${params.toString()}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`Binance API error for ${symbol}: ${response.status} - ${errorText}`);
      sendJSON(res, response.status, { error: `Binance API error: ${response.status}` });
      return;
    }

    const candles = await response.json();

    if (!Array.isArray(candles) || !candles.length) {
      console.warn(`No historical data for ${symbol} from Binance`);
      sendJSON(res, 404, { error: 'No historical data available' });
      return;
    }

    let eurRate = 1;
    let currency = 'USD';
    try {
      const eurTicker = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT', { headers: { Accept: 'application/json' } });
      if (eurTicker.ok) {
        const { price: eurPrice } = await eurTicker.json();
        const eu = Number(eurPrice);
        if (eu > 0) {
          eurRate = eu;
          currency = 'EUR';
        }
      }
    } catch (error) {
      // stay in USD
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

      const convert = (num) => currency === 'EUR' ? num / eurRate : num;

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
    const errorMsg = error?.message || String(error);
    console.warn(`Binance history failed for ${symbol}:`, errorMsg);

    // Fallback to CryptoCompare
    try {
      const base = toBaseSymbol(symbol);
      const fallbackUrl = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${base}&tsym=EUR&limit=200`;
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 10000);
      
      const resp = await fetch(fallbackUrl, { 
        headers: { Accept: 'application/json' },
        signal: controller2.signal,
      });
      
      clearTimeout(timeoutId2);
      
      if (!resp.ok) {
        const errorText = await resp.text().catch(() => 'Unknown error');
        console.error(`CryptoCompare API error for ${symbol}: ${resp.status} - ${errorText}`);
        throw new Error(`CryptoCompare history fallback failed: ${resp.status}`);
      }

      const payload = await resp.json();
      const prices = payload?.Data?.Data || [];
      if (!prices.length) {
        console.warn(`CryptoCompare returned empty data for ${symbol}`);
        throw new Error('CryptoCompare history returned empty data');
      }

      const fallbackData = prices.map(point => ({
        date: new Date(point.time * 1000).toISOString().split('T')[0],
        timestamp: point.time,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        volume: point.volumefrom ?? 0,
      }));

      sendJSON(res, 200, {
        symbol: symbol.toUpperCase(),
        currency: 'EUR',
        data: fallbackData,
        source: 'CryptoCompare',
      });
    } catch (fallbackError) {
      const fallbackMsg = fallbackError?.message || String(fallbackError);
      console.error(`All sources failed for crypto history ${symbol}:`, fallbackMsg);
      sendJSON(res, 500, { 
        error: 'Failed to fetch crypto history from all sources',
        details: fallbackMsg,
      });
    }
  }
};

