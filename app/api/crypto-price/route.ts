import { NextRequest, NextResponse } from 'next/server';

const toYahooSymbol = (symbol: string) => {
  const upper = symbol.toUpperCase();
  if (upper.includes('-')) return upper;
  return `${upper}-USD`;
};

async function fetchFromBinance(symbol: string) {
  const base = symbol.toUpperCase().replace('-USD', '');
  const pair = `${base}USDT`;
  const tickerUrl = `https://api.binance.com/api/v3/ticker/24hr?symbol=${pair}`;

  const tickerResponse = await fetch(tickerUrl, {
    headers: { Accept: 'application/json' },
  });

  if (!tickerResponse.ok) {
    throw new Error(`Binance ticker request failed: ${tickerResponse.status}`);
  }

  const ticker = await tickerResponse.json();
  if (!ticker || typeof ticker.lastPrice === 'undefined') {
    throw new Error('Binance ticker returned no data');
  }

  const priceUSDT = Number(ticker.lastPrice);
  const changePercent = Number(ticker.priceChangePercent ?? 0);

  // Convert USDT to EUR
  let price = priceUSDT;
  let currency = 'USDT';
  try {
    const eurTicker = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT');
    if (eurTicker.ok) {
      const { price: eurPrice } = await eurTicker.json();
      const eurUsdt = Number(eurPrice);
      if (eurUsdt > 0) {
        price = priceUSDT / eurUsdt;
        currency = 'EUR';
      }
    }
  } catch {
    // Fall back to USDT
  }

  return {
    symbol: symbol.toUpperCase(),
    price,
    currency,
    timestamp: Date.now(),
    changePercent,
    exchange: 'Binance',
    name: base,
    source: 'Binance',
  };
}

async function fetchFromCryptoCompare(symbol: string) {
  const base = symbol.toUpperCase().replace('-USD', '');
  const url = `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${base}&tsyms=EUR`;

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

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
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawSymbol = searchParams.get('symbol')?.trim();

  if (!rawSymbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
  }

  const yahooSymbol = toYahooSymbol(rawSymbol);

  // Try Binance first
  try {
    const payload = await fetchFromBinance(yahooSymbol);
    return NextResponse.json(payload);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn(`Binance crypto price failed for ${rawSymbol}:`, errorMsg);
  }

  // Fallback to CryptoCompare
  try {
    const fallbackPayload = await fetchFromCryptoCompare(yahooSymbol);
    return NextResponse.json(fallbackPayload);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`All sources failed for crypto price ${rawSymbol}:`, errorMsg);
    return NextResponse.json(
      { error: 'Failed to fetch crypto price from all sources', details: errorMsg, symbol: rawSymbol.toUpperCase() },
      { status: 500 }
    );
  }
}

