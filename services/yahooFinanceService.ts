
import { StockHolding, PortfolioOwner, TimeRange, AssetType, NewsItem } from "../types";

const RANGE_MAP: Record<TimeRange, { range: string; interval: string }> = {
  [TimeRange.DAY]: { range: '1d', interval: '5m' },
  [TimeRange.WEEK]: { range: '5d', interval: '15m' },
  [TimeRange.MONTH]: { range: '1mo', interval: '1h' },
  [TimeRange.SIX_MONTHS]: { range: '6mo', interval: '1d' },
  [TimeRange.YEAR]: { range: '1y', interval: '1wk' },
  [TimeRange.ALL]: { range: '5y', interval: '1mo' },
};

const CRYPTO_RANGE_MAP: Record<TimeRange, string> = {
  [TimeRange.DAY]: '1d',
  [TimeRange.WEEK]: '5d',
  [TimeRange.MONTH]: '1mo',
  [TimeRange.SIX_MONTHS]: '6mo',
  [TimeRange.YEAR]: '1y',
  [TimeRange.ALL]: 'max',
};

const COINGECKO_DAYS_MAP: Record<TimeRange, number | 'max'> = {
  [TimeRange.DAY]: 1,
  [TimeRange.WEEK]: 5,
  [TimeRange.MONTH]: 30,
  [TimeRange.SIX_MONTHS]: 180,
  [TimeRange.YEAR]: 365,
  [TimeRange.ALL]: 'max',
};

// CORS proxies removed - all Yahoo Finance calls now go through serverless API routes
const YAHOO_HEADERS: Record<string, string> = {
  'Accept': 'application/json'
};

const PRICE_CACHE_TTL_MS = 60 * 1000; // 1 minute
const METADATA_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const HISTORICAL_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

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
const historicalCache = new Map<string, CacheEntry<HistoricalPriceResult>>();
const historicalInFlight = new Map<string, Promise<HistoricalPriceResult>>();

const fetchFromApi = async <T>(path: string, params: Record<string, string>): Promise<T> => {
  const query = new URLSearchParams(params).toString();
  const url = `${path}?${query}`;
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }
  return response.json();
};

interface ApiHistoryPoint {
  date: string;
  timestamp: number;
  close?: number | null;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  volume?: number | null;
}

interface ApiHistoryResponse {
  symbol: string;
  currency?: string;
  data: ApiHistoryPoint[];
  source?: string;
}

interface ApiStockPriceResponse {
  symbol: string;
  price: number;
  currency: string;
  timestamp: number;
  exchange?: string;
  changePercent?: number;
  name?: string;
}

interface ApiCryptoPriceResponse {
  symbol: string;
  price: number;
  currency: string;
  timestamp: number;
  change24h?: number;
  changePercent?: number;
  source?: string;
}

const mapApiHistoryPoints = (items: ApiHistoryPoint[]): PricePoint[] => {
  return items
    .map((point) => {
      const priceValue = typeof point.close === 'number' ? Number(point.close.toFixed(2)) : null;
      if (priceValue == null || Number.isNaN(priceValue)) {
        return null;
      }
      return {
        date: point.date,
        timestamp: point.timestamp,
        price: priceValue,
        close: point.close ?? null,
        open: point.open ?? null,
        high: point.high ?? null,
        low: point.low ?? null,
        volume: point.volume ?? null,
      };
    })
    .filter(Boolean) as PricePoint[];
};

const fetchStockQuoteFromApi = async (symbol: string): Promise<StockQuote> => {
  const data = await fetchFromApi<ApiStockPriceResponse>('/api/stock-price', { symbol });
  return {
    price: Number(data.price),
    changePercent: Number(data.changePercent ?? 0),
    name: data.name || data.symbol || symbol,
    currency: (data.currency || 'USD').toUpperCase(),
    exchange: data.exchange || '',
    timestamp: data.timestamp || Date.now(),
  };
};

const fetchCryptoQuoteFromApi = async (symbol: string): Promise<StockQuote> => {
  const apiSymbol = getCryptoSymbolKey(symbol);
  const data = await fetchFromApi<ApiCryptoPriceResponse>('/api/crypto-price', { symbol: apiSymbol });
  return {
    price: Number(data.price),
    changePercent: Number(data.changePercent ?? data.change24h ?? 0),
    name: data.name || data.symbol || symbol,
    currency: (data.currency || 'EUR').toUpperCase(),
    exchange: data.exchange || data.source || 'Binance',
    timestamp: data.timestamp || Date.now(),
  };
};

const fetchStockHistoryFromApi = async (symbol: string, range: TimeRange): Promise<HistoricalPriceResult> => {
  const rangeParam = (RANGE_MAP[range] || RANGE_MAP[TimeRange.MONTH]).range;
  const data = await fetchFromApi<ApiHistoryResponse>('/api/stock-history', { symbol, range: rangeParam });
  return {
    data: mapApiHistoryPoints(data.data || []),
    lastUpdated: new Date().toISOString(),
    source: data.source || 'Yahoo Finance',
    currency: (data.currency || 'USD').toUpperCase(),
  };
};

const fetchCryptoHistoryFromApi = async (symbol: string, range: TimeRange): Promise<HistoricalPriceResult> => {
  const rangeParam = CRYPTO_RANGE_MAP[range] || '30';
  const apiSymbol = getCryptoSymbolKey(symbol);
  const data = await fetchFromApi<ApiHistoryResponse>('/api/crypto-history', { symbol: apiSymbol, range: rangeParam });
  return {
    data: mapApiHistoryPoints(data.data || []),
    lastUpdated: new Date().toISOString(),
    source: data.source || 'CoinGecko',
    currency: (data.currency || 'EUR').toUpperCase(),
  };
};

const fetchStockMetadataFromApi = async (symbol: string): Promise<StockMetadata> => {
  return fetchFromApi<StockMetadata>('/api/stock-metadata', { symbol });
};

// Helper: Check if symbol is a crypto
const normalizeSymbol = (symbol: string) => symbol.toUpperCase().trim();
const extractBaseSymbol = (symbol: string) => normalizeSymbol(symbol).split('-')[0];

const isCryptoSymbol = (symbol: string): boolean => {
  const upper = normalizeSymbol(symbol);
  const base = extractBaseSymbol(symbol);
  return (
    upper in CRYPTO_SYMBOL_MAP ||
    `${upper}-USD` in CRYPTO_SYMBOL_MAP ||
    base in CRYPTO_SYMBOL_MAP ||
    `${base}-USD` in CRYPTO_SYMBOL_MAP
  );
};

const getCryptoSymbolKey = (symbol: string): string => extractBaseSymbol(symbol);

// Helper: Get CoinGecko ID from symbol
const getCoinGeckoId = (symbol: string): string | null => {
  const upper = normalizeSymbol(symbol);
  const base = extractBaseSymbol(symbol);
  return (
    CRYPTO_SYMBOL_MAP[upper] ||
    CRYPTO_SYMBOL_MAP[`${upper}-USD`] ||
    CRYPTO_SYMBOL_MAP[base] ||
    CRYPTO_SYMBOL_MAP[`${base}-USD`] ||
    null
  );
};

// All Yahoo Finance calls now go through serverless API routes to avoid CORS issues

// CoinGecko direct fetch helpers (used as fallback)
const fetchCoinGeckoPriceDirect = async (coinId: string, originalSymbol?: string): Promise<StockQuote> => {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`;
  
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
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
    const infoUrl = `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`;
    const infoResponse = await fetch(infoUrl, { headers: { Accept: 'application/json' } });
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

const fetchCoinGeckoHistoryDirect = async (coinId: string, days: number | 'max'): Promise<HistoricalPriceResult> => {
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
  
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
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
    if (isCryptoSymbol(normalized) && cached.value?.source === 'Yahoo Finance') {
      priceCache.delete(normalized);
    } else {
      return cached.value;
    }
  }

  // Crypto workflow
  if (isCryptoSymbol(normalized)) {
    const coinId = getCoinGeckoId(normalized);
    if (coinId) {
      try {
        const quote = await fetchCryptoQuoteFromApi(normalized);
        priceCache.set(normalized, { value: quote, expires: now + PRICE_CACHE_TTL_MS });
        return quote;
      } catch (apiError) {
        console.warn(`Crypto API fetch failed for ${normalized}:`, (apiError as Error).message);
      }
      try {
        const quote = await fetchCoinGeckoPriceDirect(coinId, normalized);
        priceCache.set(normalized, { value: quote, expires: now + PRICE_CACHE_TTL_MS });
        return quote;
      } catch (directError) {
        console.warn(`Direct CoinGecko fetch failed for ${normalized}:`, (directError as Error).message);
      }
    }
  } else {
    // Stocks/ETFs: use serverless API (no fallback to avoid CORS issues)
    try {
      const quote = await fetchStockQuoteFromApi(normalized);
      priceCache.set(normalized, { value: quote, expires: now + PRICE_CACHE_TTL_MS });
      return quote;
    } catch (apiError) {
      console.error(`Stock API fetch failed for ${normalized}:`, (apiError as Error).message);
      throw new Error(`Failed to fetch stock quote for ${normalized}. Please ensure the serverless API is deployed and working.`);
    }
  }
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

  try {
    const historicalDataPromises = holdings.map(holding =>
      fetchHistoricalPrices(holding.symbol, range)
        .then(result => ({ holding, result }))
        .catch(error => {
          console.warn(`Failed to fetch history for ${holding.symbol}:`, (error as Error).message);
          return null;
        })
    );

    const historicalData = (await Promise.all(historicalDataPromises)).filter(Boolean) as Array<{
      holding: StockHolding;
      result: HistoricalPriceResult;
    }>;

    if (!historicalData.length) {
      return [];
    }

    // Map each timestamp to aggregated prices
    const timestampMap = new Map<number, { date: string; pricesBySymbol: Map<string, number> }>();

    historicalData.forEach(({ holding, result }) => {
      result.data.forEach(point => {
        if (!timestampMap.has(point.timestamp)) {
          timestampMap.set(point.timestamp, {
            date: point.date,
            pricesBySymbol: new Map(),
          });
        }
        timestampMap.get(point.timestamp)!.pricesBySymbol.set(holding.symbol, point.price);
      });
    });

    const sortedTimestamps = Array.from(timestampMap.keys()).sort((a, b) => a - b);
    if (!sortedTimestamps.length) {
      return [];
    }

    // Track last known price for each symbol to handle missing data points
    const lastKnownPrices = new Map<string, number>();

    const chartData = sortedTimestamps.map(timestamp => {
      const { date, pricesBySymbol } = timestampMap.get(timestamp)!;
      const snapshotPrices = new Map<string, number>();
      let meValue = 0;
      let carolinaValue = 0;

      holdings.forEach(holding => {
        // Use current price if available, otherwise use last known price
        let price = pricesBySymbol.get(holding.symbol);
        if (price !== undefined) {
          lastKnownPrices.set(holding.symbol, price);
        } else {
          price = lastKnownPrices.get(holding.symbol);
        }

        if (price !== undefined) {
          snapshotPrices.set(holding.symbol, price);
          const value = holding.shares * price;
          if (holding.owner === PortfolioOwner.ME) {
            meValue += value;
          } else if (holding.owner === PortfolioOwner.CAROLINA) {
            carolinaValue += value;
          }
        }
      });

      // Use a simple synthetic MSCI line proportional to Total to preserve comparative visuals
      const total = meValue + carolinaValue;
      const msciBase = sortedTimestamps[0];
      const elapsed = timestamp - msciBase;
      const msci = total > 0 ? total * (1 + Math.sin(elapsed / (24 * 3600)) * 0.02) : 0;

      return {
        date,
        Me: meValue,
        Carolina: carolinaValue,
        Total: total,
        MSCI: msci,
        prices: Object.fromEntries(snapshotPrices),
      };
    }).filter(point => point.Total > 0);

    return chartData;
  } catch (error) {
    console.error('Error generating portfolio history:', error);
    return [];
  }
};
export const fetchHistoricalPrices = async (symbol: string, range: TimeRange): Promise<HistoricalPriceResult> => {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) {
    throw new Error('Ticker symbol is required.');
  }

  const cacheKey = `${normalized}-${range}`;
  const now = Date.now();
  const cached = historicalCache.get(cacheKey);
  if (cached && cached.expires > now) {
    if (isCryptoSymbol(normalized) && cached.value?.source === 'Yahoo Finance') {
      historicalCache.delete(cacheKey);
    } else {
      return cached.value;
    }
  }

  const pending = historicalInFlight.get(cacheKey);
  if (pending) {
    return pending;
  }

  const fetchPromise = (async (): Promise<HistoricalPriceResult> => {
    if (isCryptoSymbol(normalized)) {
      try {
        return await fetchCryptoHistoryFromApi(normalized, range);
      } catch (apiError) {
        console.warn(`Crypto history API failed for ${normalized}:`, (apiError as Error).message);
        const coinId = getCoinGeckoId(normalized);
        if (coinId) {
          const days = COINGECKO_DAYS_MAP[range] ?? 30;
          return fetchCoinGeckoHistoryDirect(coinId, days);
        }
        throw apiError;
      }
    }

    try {
      return await fetchStockHistoryFromApi(normalized, range);
    } catch (apiError) {
      console.error(`Stock history API failed for ${normalized}:`, (apiError as Error).message);
      throw new Error(`Failed to fetch stock history for ${normalized}. Please ensure the serverless API is deployed and working.`);
    }
  })();

  historicalInFlight.set(cacheKey, fetchPromise);

  try {
    const result = await fetchPromise;
    historicalCache.set(cacheKey, { value: result, expires: now + HISTORICAL_CACHE_TTL_MS });
    return result;
  } finally {
    historicalInFlight.delete(cacheKey);
  }
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

  try {
    const metadata = await fetchStockMetadataFromApi(normalized);
    metadataCache.set(normalized, { value: metadata, expires: now + METADATA_CACHE_TTL_MS });
    return metadata;
  } catch (apiError) {
    console.error(`Metadata API failed for ${normalized}:`, (apiError as Error).message);
    // Return null metadata instead of failing completely
    const metadata: StockMetadata = {
      symbol: normalized,
      sector: null,
      industry: null,
      country: null,
      category: null,
    };
    metadataCache.set(normalized, { value: metadata, expires: now + METADATA_CACHE_TTL_MS });
    return metadata;
  }
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
