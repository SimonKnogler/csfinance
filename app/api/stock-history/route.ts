import { NextRequest, NextResponse } from 'next/server';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function getIntervalForRange(range: string): string {
  switch (range) {
    case '1d': return '5m';
    case '5d': return '15m';
    case '1mo': return '1h';
    case '6mo': return '1d';
    case '1y': return '1d';
    case '5y': return '1wk';
    case 'max': return '1mo';
    default: return '1d';
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol')?.trim();
  const range = searchParams.get('range') || '1mo';

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
  }

  const interval = getIntervalForRange(range);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`Yahoo Finance API error for ${symbol}: ${response.status}`);
      return NextResponse.json({ error: `Yahoo Finance API error: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];

    if (!result) {
      console.warn(`No chart data returned for ${symbol}`);
      return NextResponse.json({ error: 'No data returned' }, { status: 404 });
    }

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const closes = quotes.close || [];
    const opens = quotes.open || [];
    const highs = quotes.high || [];
    const lows = quotes.low || [];
    const volumes = quotes.volume || [];

    const chartData = timestamps
      .map((ts: number, idx: number) => {
        const date = new Date(ts * 1000);
        const dateStr = interval.includes('m') || interval.includes('h')
          ? date.toISOString().slice(0, 16).replace('T', ' ')
          : date.toISOString().split('T')[0];

        return {
          date: dateStr,
          timestamp: ts,
          close: closes[idx],
          open: opens[idx],
          high: highs[idx],
          low: lows[idx],
          volume: volumes[idx],
        };
      })
      .filter((point: any) => point.close !== null && point.close !== undefined);

    const currency = result.meta?.currency || 'USD';

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      currency: currency.toUpperCase(),
      data: chartData,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Error fetching stock history for ${symbol}:`, errorMsg);
    return NextResponse.json(
      { error: 'Failed to fetch stock history', details: errorMsg, symbol },
      { status: 500 }
    );
  }
}

