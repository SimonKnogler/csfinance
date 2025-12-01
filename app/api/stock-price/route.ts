import { NextRequest, NextResponse } from 'next/server';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol')?.trim();

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`Yahoo Finance API error for ${symbol}: ${response.status}`);
      return NextResponse.json({ error: `Failed to fetch: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];

    if (!result) {
      return NextResponse.json({ error: 'No data returned' }, { status: 404 });
    }

    const price = result.meta?.regularMarketPrice;
    const currency = result.meta?.currency || 'USD';
    const exchange = result.meta?.exchangeName || '';

    if (typeof price !== 'number') {
      return NextResponse.json({ error: 'Invalid price data' }, { status: 404 });
    }

    // Fetch quote for change percent and name
    let changePercent = 0;
    let name = symbol.toUpperCase();

    try {
      const quoteResponse = await fetch(
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`,
        {
          headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'application/json',
          },
        }
      );

      if (quoteResponse.ok) {
        const quoteJson = await quoteResponse.json();
        const quote = quoteJson?.quoteResponse?.result?.[0];
        if (quote) {
          changePercent = Number(quote.regularMarketChangePercent ?? 0);
          name = quote.longName || quote.shortName || name;
        }
      }
    } catch (e) {
      // Ignore quote fetch errors
    }

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      price,
      currency: currency.toUpperCase(),
      timestamp: Date.now(),
      exchange,
      changePercent,
      name,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Error fetching stock price for ${symbol}:`, errorMsg);
    return NextResponse.json(
      { error: 'Failed to fetch stock price', details: errorMsg, symbol },
      { status: 500 }
    );
  }
}

