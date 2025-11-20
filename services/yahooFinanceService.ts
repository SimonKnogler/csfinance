
import { StockHolding, PortfolioOwner, TimeRange, AssetType, NewsItem } from "../types";

const RANGE_MAP: Record<TimeRange, { range: string; interval: string }> = {
  [TimeRange.DAY]: { range: '1d', interval: '5m' },
  [TimeRange.WEEK]: { range: '5d', interval: '15m' },
  [TimeRange.MONTH]: { range: '1mo', interval: '1h' },
  [TimeRange.SIX_MONTHS]: { range: '6mo', interval: '1d' },
  [TimeRange.YEAR]: { range: '1y', interval: '1wk' },
  [TimeRange.ALL]: { range: '5y', interval: '1mo' },
};

// Check if we're in development mode (with Vite proxy available)
const isDev = import.meta.env.DEV;

const YAHOO_PROXY_ENDPOINTS: { prefix: string; encode: boolean }[] = [
  // Use Vercel serverless functions (works in dev AND production)
  { prefix: '/api/yahoo', encode: false },
];

const YAHOO_HEADERS: Record<string, string> = {
  'Accept': 'application/json'
};

const PRICE_CACHE_TTL_MS = 60 * 1000; // 1 minute
const METADATA_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

type CacheEntry<T> = { expires: number; value: T };

// CoinGecko symbol mapping (Yahoo format -> CoinGecko ID)
const CRYPTO_SYMBOL_MAP: Record<string, string> = {
  'BTC-USD': 'bitcoin',
  'BTC': 'bitcoin',
  'ETH-USD': 'ethereum',
  'ETH': 'ethereum',
  'USDT-USD': 'tether',
  'USDT': 'tether',
  'BNB-USD': 'binancecoin',
  'BNB': 'binancecoin',
  'SOL-USD': 'solana',
  'SOL': 'solana',
  'USDC-USD': 'usd-coin',
  'USDC': 'usd-coin',
  'XRP-USD': 'ripple',
  'XRP': 'ripple',
  'DOGE-USD': 'dogecoin',
  'DOGE': 'dogecoin',
  'ADA-USD': 'cardano',
  'ADA': 'cardano',
  'AVAX-USD': 'avalanche-2',
  'AVAX': 'avalanche-2',
  'SHIB-USD': 'shiba-inu',
  'SHIB': 'shiba-inu',
  'DOT-USD': 'polkadot',
  'DOT': 'polkadot',
  'MATIC-USD': 'matic-network',
  'MATIC': 'matic-network',
  'POLYGON': 'matic-network',
  'LTC-USD': 'litecoin',
  'LTC': 'litecoin',
  'TRX-USD': 'tron',
  'TRX': 'tron',
  'LINK-USD': 'chainlink',
  'LINK': 'chainlink',
  'UNI-USD': 'uniswap',
  'UNI': 'uniswap',
  'ATOM-USD': 'cosmos',
  'ATOM': 'cosmos',
  'XLM-USD': 'stellar',
  'XLM': 'stellar',
  'ALGO-USD': 'algorand',
  'ALGO': 'algorand',
  'VET-USD': 'vechain',
  'VET': 'vechain',
  'ICP-USD': 'internet-computer',
  'ICP': 'internet-computer',
  'FIL-USD': 'filecoin',
  'FIL': 'filecoin',
  'NEAR-USD': 'near',
  'NEAR': 'near',
  'APT-USD': 'aptos',
  'APT': 'aptos',
  'ARB-USD': 'arbitrum',
  'ARB': 'arbitrum',
  'OP-USD': 'optimism',
  'OP': 'optimism',
  'SUI-USD': 'sui',
  'SUI': 'sui',
};

export type PricePoint = { 
  date: string; 
  price: number; 
  timestamp: number;
  open?: number | null;
  close?: number | null;
  high?: number | null;
  low?: number | null;
  volume?: number | null;
};

export interface HistoricalPriceResult {
  data: PricePoint[];
  lastUpdated: string;
  source: string;
  currency?: string;
}

export interface StockQuote {
  price: number;
  changePercent: number;
  name: string;
  currency: string;
  exchange?: string;
  timestamp: number;
}

export interface StockMetadata {
  symbol: string;
  sector: string | null;
  industry: string | null;
  country: string | null;
  category: string | null;
}

const priceCache = new Map<string, CacheEntry<StockQuote>>();
const metadataCache = new Map<string, CacheEntry<StockMetadata>>();

// Helper: Check if symbol is a crypto
const isCryptoSymbol = (symbol: string): boolean => {
  const upper = symbol.toUpperCase();
  // Check if symbol is in the map directly or with -USD suffix
  return upper in CRYPTO_SYMBOL_MAP || `${upper}-USD` in CRYPTO_SYMBOL_MAP;
};

// Helper: Get CoinGecko ID from symbol
const getCoinGeckoId = (symbol: string): string | null => {
  const upper = symbol.toUpperCase();
  // Try direct match first, then with -USD suffix
  return CRYPTO_SYMBOL_MAP[upper] || CRYPTO_SYMBOL_MAP[`${upper}-USD`] || null;
};

const fetchYahooJson = async (url: string) => {
  const attemptErrors: string[] = [];

  for (const { prefix } of YAHOO_PROXY_ENDPOINTS) {
    // Replace Yahoo domain with our API proxy path (works in dev AND production)
    const proxiedUrl = url.replace('https://query1.finance.yahoo.com', '/api/yahoo')
                          .replace('https://query2.finance.yahoo.com', '/api/yahoo2');
    
    try {
      const response = await fetch(proxiedUrl, { headers: YAHOO_HEADERS, cache: 'no-store' });
      if (!response.ok) {
        attemptErrors.push(`${proxiedUrl} → HTTP ${response.status}`);
        continue;
      }
      const text = await response.text();
      if (!text) {
        attemptErrors.push(`${proxiedUrl} → empty body`);
        continue;
      }
      try {
        return JSON.parse(text);
      } catch (parseError) {
        attemptErrors.push(`${proxiedUrl} → invalid JSON (${(parseError as Error).message})`);
      }
    } catch (error) {
      attemptErrors.push(`${proxiedUrl} → ${(error as Error).message}`);
    }
  }

  console.warn('Yahoo Finance request failed via all proxies:', attemptErrors.join(' | '));
  throw new Error('Yahoo Finance request failed across all proxy attempts.');
};

const fetchYahooChartResult = async (symbol: string, range: string, interval: string) => {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false&events=div,splits`;
  const json = await fetchYahooJson(url);

  if (json?.chart?.error) {
    throw new Error(json.chart.error.description || 'Yahoo Finance returned an error response.');
  }

  const result = json?.chart?.result?.[0];
  if (!result) {
    throw new Error('Yahoo Finance returned no chart data.');
  }

  return result;
};

const fetchYahooQuoteSnapshot = async (symbol: string) => {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
  const json = await fetchYahooJson(url);
  return json?.quoteResponse?.result?.[0];
};

// CoinGecko API functions
const fetchCoinGeckoPrice = async (coinId: string, originalSymbol?: string): Promise<StockQuote> => {
  // Use Vercel serverless function (works in dev AND production)
  const url = `/api/coingecko/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status}`);
  }
  
  const data = await response.json();
  const coinData = data[coinId];
  
  if (!coinData || typeof coinData.usd !== 'number') {
    throw new Error(`No price data for ${coinId}`);
  }
  
  // Try to get proper name from a separate API call
  let coinName = coinId.charAt(0).toUpperCase() + coinId.slice(1).replace(/-/g, ' ');
  try {
    const infoUrl = `/api/coingecko/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`;
    const infoResponse = await fetch(infoUrl);
    if (infoResponse.ok) {
      const infoData = await infoResponse.json();
      coinName = infoData.name || coinName;
    }
  } catch (e) {
    // Use fallback name if info fetch fails
  }
  
  return {
    price: coinData.usd,
    changePercent: coinData.usd_24h_change || 0,
    name: coinName,
    currency: 'USD',
    exchange: 'CoinGecko',
    timestamp: (coinData.last_updated_at || Date.now() / 1000) * 1000,
  };
};

const fetchCoinGeckoHistory = async (coinId: string, days: number): Promise<HistoricalPriceResult> => {
  // Use Vercel serverless function (works in dev AND production)
  const url = `/api/coingecko/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status}`);
  }
  
  const data = await response.json();
  const prices = data.prices || [];
  
  if (!prices.length) {
    throw new Error('No historical data available');
  }
  
  const points: PricePoint[] = prices.map(([timestamp, price]: [number, number]) => {
    const date = new Date(timestamp);
    return {
      date: date.toISOString().split('T')[0],
      timestamp: timestamp / 1000,
      price: Number(price.toFixed(2)),
      close: Number(price.toFixed(2)),
      open: null,
      high: null,
      low: null,
      volume: null,
    };
  });
  
  return {
    data: points,
    lastUpdated: new Date().toISOString(),
    source: 'CoinGecko',
    currency: 'USD',
  };
};

const formatTimestampLabel = (timestamp: number, interval: string) => {
  const date = new Date(timestamp * 1000);
  if (interval.includes('m') || interval.includes('h')) {
    return date.toISOString().slice(0, 16).replace('T', ' ');
  }
  return date.toISOString().split('T')[0];
};

export const fetchStockQuote = async (symbol: string): Promise<StockQuote> => {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) {
    throw new Error('Ticker symbol is required.');
  }

  const now = Date.now();
  const cached = priceCache.get(normalized);
  if (cached && cached.expires > now) {
    return cached.value;
  }

  // Check if this is a crypto symbol - use CoinGecko
  if (isCryptoSymbol(normalized)) {
    const coinId = getCoinGeckoId(normalized);
    if (coinId) {
      try {
        const quote = await fetchCoinGeckoPrice(coinId, normalized);
        priceCache.set(normalized, { value: quote, expires: now + PRICE_CACHE_TTL_MS });
        return quote;
      } catch (error) {
        console.warn(`CoinGecko fetch failed for ${normalized}, falling back to Yahoo:`, (error as Error).message);
        // Fall through to Yahoo Finance
      }
    }
  }

  // Use Yahoo Finance for stocks/ETFs
  const chartResult = await fetchYahooChartResult(normalized, '1d', '1d');
  const meta = chartResult.meta ?? {};
  const indicator = chartResult.indicators?.quote?.[0] ?? {};
  const closes = indicator.close || [];
  const latestClose = closes[closes.length - 1];

  const price = typeof meta.regularMarketPrice === 'number'
    ? Number(meta.regularMarketPrice)
    : typeof latestClose === 'number'
      ? Number(latestClose)
      : null;

  if (price == null || Number.isNaN(price)) {
    throw new Error(`Yahoo Finance returned invalid price data for ${normalized}.`);
  }

  const prevClose = typeof meta.chartPreviousClose === 'number'
    ? Number(meta.chartPreviousClose)
    : typeof meta.previousClose === 'number'
      ? Number(meta.previousClose)
      : (typeof closes[closes.length - 2] === 'number' ? Number(closes[closes.length - 2]) : null);

  let changePercent = prevClose && prevClose !== 0 ? ((price - prevClose) / prevClose) * 100 : 0;
  let companyName = meta.symbol || normalized;

  try {
    const snapshot = await fetchYahooQuoteSnapshot(normalized);
    if (snapshot) {
      companyName = snapshot.longName || snapshot.shortName || companyName;
      if (typeof snapshot.regularMarketChangePercent === 'number') {
        changePercent = Number(snapshot.regularMarketChangePercent);
      }
    }
  } catch (error) {
    console.warn(`Failed to fetch Yahoo quote snapshot for ${normalized}:`, (error as Error).message);
  }

  const quote: StockQuote = {
    price: Number(price),
    changePercent,
    name: companyName,
    currency: (meta.currency || 'USD').toUpperCase(),
    exchange: meta.exchangeName || '',
    timestamp: Date.now(),
  };

  priceCache.set(normalized, { value: quote, expires: now + PRICE_CACHE_TTL_MS });

  return quote;
};

export const getInitialPortfolio = (): StockHolding[] => [
  {
    id: '1',
    symbol: 'NVDA',
    name: 'NVIDIA Corp.',
    shares: 10,
    avgCost: 410.00,
    currentPrice: 810.00,
    owner: PortfolioOwner.ME,
    dayChangePercent: 2.4,
    type: AssetType.STOCK
  },
  {
    id: '2',
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    shares: 25,
    avgCost: 190.00,
    currentPrice: 220.30,
    owner: PortfolioOwner.ME,
    dayChangePercent: -1.2,
    type: AssetType.STOCK
  },
  {
    id: '3',
    symbol: 'VOO',
    name: 'Vanguard S&P 500',
    shares: 40,
    avgCost: 360.00,
    currentPrice: 430.20,
    owner: PortfolioOwner.CAROLINA,
    dayChangePercent: 0.5,
    type: AssetType.ETF
  },
  {
    id: '4',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    shares: 50,
    avgCost: 135.00,
    currentPrice: 160.50,
    owner: PortfolioOwner.CAROLINA,
    dayChangePercent: 0.8,
    type: AssetType.STOCK
  },
  {
    id: '5',
    symbol: 'BTC-USD',
    name: 'Bitcoin',
    shares: 0.15,
    avgCost: 48000.00,
    currentPrice: 62500.00,
    owner: PortfolioOwner.ME,
    dayChangePercent: 3.2,
    type: AssetType.CRYPTO
  }
];

const formatPortfolioLabel = (timestamp: number, range: TimeRange) => {
  const date = new Date(timestamp * 1000);
  if (range === TimeRange.DAY) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: range === TimeRange.ALL ? '2-digit' : undefined });
};

export const generatePortfolioHistory = async (holdings: StockHolding[], range: TimeRange) => {
  if (!holdings.length) {
    return [];
  }

  // Calculate current portfolio value (as if all positions were acquired today)
  let currentMe = 0;
  let currentCarolina = 0;
  
  holdings.forEach(holding => {
    const value = holding.shares * holding.currentPrice;
    if (holding.owner === PortfolioOwner.ME) {
      currentMe += value;
    } else if (holding.owner === PortfolioOwner.CAROLINA) {
      currentCarolina += value;
    }
  });

  const currentTotal = currentMe + currentCarolina;
  const now = Date.now() / 1000; // Current timestamp in seconds

  // Generate a single data point for "today" (starting point)
  const today = new Date();
  const chartData = [
    {
      date: formatPortfolioLabel(now, range),
      Me: currentMe,
      Carolina: currentCarolina,
      Total: currentTotal,
      MSCI: currentTotal, // Benchmark starts at same level
    }
  ];

  return chartData;
};
export const fetchHistoricalPrices = async (symbol: string, range: TimeRange): Promise<HistoricalPriceResult> => {
  const normalized = symbol.trim().toUpperCase();
  
  // Check if this is a crypto - use CoinGecko
  if (isCryptoSymbol(normalized)) {
    const coinId = getCoinGeckoId(normalized);
    if (coinId) {
      try {
        // Map TimeRange to CoinGecko days parameter
        const daysMap: Record<TimeRange, number> = {
          [TimeRange.DAY]: 1,
          [TimeRange.WEEK]: 7,
          [TimeRange.MONTH]: 30,
          [TimeRange.SIX_MONTHS]: 180,
          [TimeRange.YEAR]: 365,
          [TimeRange.ALL]: 'max' as any,
        };
        const days = daysMap[range] || 30;
        return await fetchCoinGeckoHistory(coinId, days);
      } catch (error) {
        console.warn(`CoinGecko history failed for ${normalized}, falling back to Yahoo:`, (error as Error).message);
        // Fall through to Yahoo Finance
      }
    }
  }

  // Use Yahoo Finance for stocks/ETFs
  const config = RANGE_MAP[range] || RANGE_MAP[TimeRange.MONTH];
  const result = await fetchYahooChartResult(normalized, config.range, config.interval);

  const timestamps: number[] = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const closes: (number | null)[] = quote.close || [];
  const opens: (number | null)[] = quote.open || [];
  const highs: (number | null)[] = quote.high || [];
  const lows: (number | null)[] = quote.low || [];
  const volumes: (number | null)[] = quote.volume || [];

  if (!timestamps.length || !closes.length) {
    throw new Error('Yahoo Finance returned an empty price series.');
  }

  const points = timestamps
    .map((timestamp, idx) => {
      const close = closes[idx];
      if (typeof close !== 'number') return null;
      return {
        date: formatTimestampLabel(timestamp, config.interval),
        timestamp,
        price: Number(close.toFixed(2)),
        close: Number(close.toFixed(2)),
        open: typeof opens[idx] === 'number' ? Number((opens[idx] as number).toFixed(2)) : null,
        high: typeof highs[idx] === 'number' ? Number((highs[idx] as number).toFixed(2)) : null,
        low: typeof lows[idx] === 'number' ? Number((lows[idx] as number).toFixed(2)) : null,
        volume: typeof volumes[idx] === 'number' ? Number(volumes[idx]) : null,
      };
    })
    .filter((point): point is PricePoint => Boolean(point));

  if (!points.length) {
    throw new Error('Yahoo Finance returned no usable price points.');
  }

  const lastTimestamp = result.meta?.regularMarketTime || timestamps[timestamps.length - 1];
  const lastUpdated = lastTimestamp ? new Date(lastTimestamp * 1000).toISOString() : new Date().toISOString();
  const currency = (result.meta?.currency || 'USD').toUpperCase();

  return {
    data: points,
    lastUpdated,
    source: 'Yahoo Finance',
    currency,
  };
};

export const loadHoldingHistory = async (holding: StockHolding, range: TimeRange): Promise<HistoricalPriceResult> => {
  return fetchHistoricalPrices(holding.symbol, range);
};

export const fetchStockMetadata = async (symbol: string): Promise<StockMetadata> => {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) {
    throw new Error('Ticker symbol is required.');
  }

  const now = Date.now();
  const cached = metadataCache.get(normalized);
  if (cached && cached.expires > now) {
    return cached.value;
  }

  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(normalized)}?modules=assetProfile,fundProfile,summaryProfile`;
  const json = await fetchYahooJson(url);
  const summary = json?.quoteSummary?.result?.[0];
  const assetProfile = summary?.assetProfile;
  const fundProfile = summary?.fundProfile;
  const summaryProfile = summary?.summaryProfile;

  const metadata: StockMetadata = {
    symbol: normalized,
    sector: assetProfile?.sector ?? summaryProfile?.sector ?? null,
    industry: assetProfile?.industry ?? summaryProfile?.industry ?? null,
    country: assetProfile?.country ?? summaryProfile?.country ?? null,
    category: fundProfile?.categoryName ?? fundProfile?.investmentStyle ?? null,
  };

  metadataCache.set(normalized, { value: metadata, expires: now + METADATA_CACHE_TTL_MS });

  return metadata;
};

export const fetchMarketNews = async (): Promise<NewsItem[]> => {
  return [
    {
      id: '1',
      title: 'NVIDIA Surges past estimates as AI demand skyrockets',
      source: 'Bloomberg',
      time: '2h ago',
      relatedTickers: ['NVDA'],
      sentiment: 'POSITIVE',
      imageUrl: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400&q=80',
      url: 'https://www.bloomberg.com/quote/NVDA:US'
    },
    {
      id: '2',
      title: 'Bitcoin holds steady above €60k amid regulatory talks',
      source: 'CoinDesk',
      time: '4h ago',
      relatedTickers: ['BTC-USD'],
      sentiment: 'NEUTRAL',
      imageUrl: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=400&q=80',
      url: 'https://www.coindesk.com/price/bitcoin/'
    },
    {
      id: '3',
      title: 'Tesla announces new Gigafactory plans in Southeast Asia',
      source: 'Reuters',
      time: '6h ago',
      relatedTickers: ['TSLA'],
      sentiment: 'POSITIVE',
      imageUrl: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=400&q=80',
      url: 'https://www.reuters.com/business/autos-transportation/tesla-china-made-ev-sales-rise-153-yoy-august-2024-09-02/'
    },
    {
      id: '4',
      title: 'Market Analysis: Why tech stocks might face headwinds in Q4',
      source: 'Wall Street Journal',
      time: '10h ago',
      relatedTickers: ['AAPL', 'MSFT', 'GOOGL'],
      sentiment: 'NEGATIVE',
      imageUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=400&q=80',
      url: 'https://www.wsj.com/finance/stocks'
    },
    {
      id: '5',
      title: 'ECB hints at potential rate cuts later this year',
      source: 'CNBC',
      time: '12h ago',
      relatedTickers: ['VOO', 'VTI'],
      sentiment: 'POSITIVE',
      imageUrl: 'https://images.unsplash.com/photo-1611974765270-ca12586343bb?w=400&q=80',
      url: 'https://www.cnbc.com/world/?region=europe'
    }
  ];
};
