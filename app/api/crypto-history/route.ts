import { NextRequest, NextResponse } from 'next/server';

const RANGE_CONFIG: Record<string, { interval: string; limit: number }> = {
  '1d': { interval: '5m', limit: 288 },
  '5d': { interval: '30m', limit: 240 },
  '1mo': { interval: '1h', limit: 720 },
  '6mo': { interval: '4h', limit: 1080 },
  '1y': { interval: '1d', limit: 365 },
  '5y': { interval: '1d', limit: 1825 },
  'max': { interval: '1d', limit: 2000 },
};

const toBaseSymbol = (symbol: string) => symbol.toUpperCase().replace('-USD', '');
const toBinancePair = (symbol: string) => `${toBaseSymbol(symbol)}USDT`;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol')?.trim();
  const range = searchParams.get('range') || '1mo';

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
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
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      console.warn(`Binance API error for ${symbol}: ${response.status}`);
      throw new Error(`Binance API error: ${response.status}`);
    }

    const candles = await response.json();

    if (!Array.isArray(candles) || !candles.length) {
      console.warn(`No historical data for ${symbol} from Binance`);
      throw new Error('No historical data available');
    }

    // Get EUR rate for conversion
    let eurRate = 1;
    let currency = 'USD';
    try {
      const eurTicker = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT');
      if (eurTicker.ok) {
        const { price: eurPrice } = await eurTicker.json();
        const eu = Number(eurPrice);
        if (eu > 0) {
          eurRate = eu;
          currency = 'EUR';
        }
      }
    } catch {
      // stay in USD
    }

    const chartData = candles.map((candle: any[]) => {
      const [openTime, open, high, low, close, volume] = candle;
      const convert = (num: number) => currency === 'EUR' ? num / eurRate : num;

      return {
        date: new Date(openTime).toISOString().split('T')[0],
        timestamp: Math.floor(openTime / 1000),
        open: convert(Number(open)),
        high: convert(Number(high)),
        low: convert(Number(low)),
        close: convert(Number(close)),
        volume: Number(volume),
      };
    });

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      currency,
      data: chartData,
      source: 'Binance',
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn(`Binance history failed for ${symbol}:`, errorMsg);

    // Fallback to CryptoCompare
    try {
      const base = toBaseSymbol(symbol);
      const fallbackUrl = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${base}&tsym=EUR&limit=200`;

      const resp = await fetch(fallbackUrl, {
        headers: { Accept: 'application/json' },
      });

      if (!resp.ok) {
        throw new Error(`CryptoCompare fallback failed: ${resp.status}`);
      }

      const payload = await resp.json();
      const prices = payload?.Data?.Data || [];
      if (!prices.length) {
        throw new Error('CryptoCompare returned empty data');
      }

      const fallbackData = prices.map((point: any) => ({
        date: new Date(point.time * 1000).toISOString().split('T')[0],
        timestamp: point.time,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        volume: point.volumefrom ?? 0,
      }));

      return NextResponse.json({
        symbol: symbol.toUpperCase(),
        currency: 'EUR',
        data: fallbackData,
        source: 'CryptoCompare',
      });
    } catch (fallbackError) {
      const fallbackMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      console.error(`All sources failed for crypto history ${symbol}:`, fallbackMsg);
      return NextResponse.json(
        { error: 'Failed to fetch crypto history from all sources', details: fallbackMsg },
        { status: 500 }
      );
    }
  }
}

