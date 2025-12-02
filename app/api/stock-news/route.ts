import { NextRequest, NextResponse } from 'next/server';

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.5 Safari/605.1.15';

interface YahooNewsItem {
  uuid: string;
  title: string;
  publisher: string;
  link: string;
  providerPublishTime: number;
  type: string;
  thumbnail?: {
    resolutions?: Array<{
      url: string;
      width: number;
      height: number;
    }>;
  };
  relatedTickers?: string[];
}

interface NewsResponse {
  id: string;
  title: string;
  source: string;
  time: string;
  url: string;
  imageUrl?: string;
  relatedTickers: string[];
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
}

// Simple sentiment analysis based on keywords
function analyzeSentiment(title: string): 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' {
  const lowerTitle = title.toLowerCase();
  
  const positiveWords = ['surge', 'surges', 'gain', 'gains', 'rise', 'rises', 'jump', 'jumps', 
    'rally', 'rallies', 'soar', 'soars', 'beat', 'beats', 'record', 'high', 'profit', 
    'growth', 'bullish', 'upgrade', 'outperform', 'buy', 'strong', 'boom'];
  
  const negativeWords = ['fall', 'falls', 'drop', 'drops', 'decline', 'declines', 'plunge', 
    'plunges', 'crash', 'crashes', 'loss', 'losses', 'miss', 'misses', 'low', 'bearish', 
    'downgrade', 'underperform', 'sell', 'weak', 'warning', 'risk', 'cut', 'cuts'];
  
  let score = 0;
  positiveWords.forEach(word => {
    if (lowerTitle.includes(word)) score += 1;
  });
  negativeWords.forEach(word => {
    if (lowerTitle.includes(word)) score -= 1;
  });
  
  if (score > 0) return 'POSITIVE';
  if (score < 0) return 'NEGATIVE';
  return 'NEUTRAL';
}

// Format relative time
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp * 1000; // Yahoo provides seconds
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp * 1000).toLocaleDateString();
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbols = searchParams.get('symbols')?.trim();
  
  // If no symbols provided, fetch general market news
  const symbolList = symbols ? symbols.split(',').map(s => s.trim().toUpperCase()) : [];
  
  try {
    const allNews: NewsResponse[] = [];
    const seenIds = new Set<string>();
    
    // Fetch news for each symbol (or general news if no symbols)
    const symbolsToFetch = symbolList.length > 0 ? symbolList : ['SPY', 'QQQ']; // Default to market ETFs
    
    for (const symbol of symbolsToFetch.slice(0, 5)) { // Limit to 5 symbols to avoid rate limiting
      try {
        // Yahoo Finance news API endpoint
        const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=0&newsCount=10&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query&multiQuoteQueryId=multi_quote_single_token_query&newsQueryId=news_cie_vespa&enableCb=true&enableNavLinks=false&enableEnhancedTrivialQuery=false`;
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'application/json',
          },
        });
        
        if (!response.ok) {
          console.warn(`Failed to fetch news for ${symbol}: ${response.status}`);
          continue;
        }
        
        const data = await response.json();
        const newsItems: YahooNewsItem[] = data?.news || [];
        
        newsItems.forEach(item => {
          if (seenIds.has(item.uuid)) return;
          seenIds.add(item.uuid);
          
          // Get best thumbnail
          const thumbnails = item.thumbnail?.resolutions || [];
          const bestThumb = thumbnails.find(t => t.width >= 300) || thumbnails[0];
          
          allNews.push({
            id: item.uuid,
            title: item.title,
            source: item.publisher,
            time: formatRelativeTime(item.providerPublishTime),
            url: item.link,
            imageUrl: bestThumb?.url,
            relatedTickers: item.relatedTickers || [symbol],
            sentiment: analyzeSentiment(item.title),
          });
        });
      } catch (symbolError) {
        console.warn(`Error fetching news for ${symbol}:`, symbolError);
      }
    }
    
    // Sort by recency (most recent first) and limit results
    allNews.sort((a, b) => {
      // Parse relative time back for sorting (hacky but works)
      const getMinutes = (time: string) => {
        if (time.includes('m ago')) return parseInt(time);
        if (time.includes('h ago')) return parseInt(time) * 60;
        if (time.includes('d ago')) return parseInt(time) * 60 * 24;
        return 10000; // Old news
      };
      return getMinutes(a.time) - getMinutes(b.time);
    });
    
    return NextResponse.json({
      news: allNews.slice(0, 15), // Return top 15 news items
      symbols: symbolList,
      timestamp: Date.now(),
    });
    
  } catch (error) {
    console.error('Error fetching stock news:', error);
    return NextResponse.json({ error: 'Failed to fetch news', news: [] }, { status: 500 });
  }
}

