
import React, { useState, useEffect, useMemo } from 'react';
import { 
  RefreshCw, 
  Plus, 
  Globe, 
  Briefcase, 
  Edit2, 
  Trash2, 
  X,
  TrendingUp,
  Newspaper,
  Bitcoin,
  Zap,
  LayoutGrid,
  Loader2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  Line,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
  ComposedChart
} from 'recharts';
import { StockHolding, PortfolioOwner, TimeRange, AssetType, NewsItem, CashHolding } from '../types';
import { fetchStockQuote, fetchHistoricalPrices, fetchMarketNews, loadHoldingHistory, PricePoint } from '../services/yahooFinanceService';
import { StorageService } from '../services/storageService';
import { Card, Button, Input, Select, Badge, Money } from './UIComponents';

interface PortfolioProps {
  privacy: boolean;
}

enum SubView {
  OVERVIEW = 'Overview',
  PROJECTIONS = 'Projections',
}

type PortfolioHistoryPoint = {
  date: string;
  Me: number;
  Carolina: number;
  Total: number;
  MSCI: number;
  prices?: Record<string, number>;
};

export const Portfolio: React.FC<PortfolioProps> = ({ privacy }) => {
  const [subView, setSubView] = useState<SubView>(SubView.OVERVIEW);
  
  const [holdings, setHoldings] = useState<StockHolding[]>([]);
  const [cashHoldings, setCashHoldings] = useState<CashHolding[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>(TimeRange.MONTH);
  const [activeTab, setActiveTab] = useState<'Total' | 'Me' | 'Carolina'>('Total');
  const [showBenchmark, setShowBenchmark] = useState(false);
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<StockHolding | null>(null);
  const [isAddCashModalOpen, setIsAddCashModalOpen] = useState(false);
  
  const [historyData, setHistoryData] = useState<PortfolioHistoryPoint[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [selectedHolding, setSelectedHolding] = useState<StockHolding | null>(null);
  const [holdingTimeRange, setHoldingTimeRange] = useState<TimeRange>(TimeRange.MONTH);
  const [holdingHistory, setHoldingHistory] = useState<PricePoint[]>([]);
  const [isHoldingHistoryLoading, setIsHoldingHistoryLoading] = useState(false);
  const [holdingLastUpdated, setHoldingLastUpdated] = useState<string | null>(null);
  const [holdingSource, setHoldingSource] = useState<string | null>(null);
  const [holdingError, setHoldingError] = useState<string | null>(null);

  // --- DATA LOADING ---
  useEffect(() => {
     const load = async () => {
        const data = await StorageService.getPortfolio();
        setHoldings(data);
        const cash = await StorageService.getCash();
        setCashHoldings(cash);
        const newsData = await fetchMarketNews();
        setNews(newsData);
     };
     load();
  }, []);

  // --- PERSISTENCE ---
  // Wrapper to save state
  const updateHoldings = async (newHoldings: StockHolding[]) => {
      setHoldings(newHoldings);
      await StorageService.savePortfolio(newHoldings);
  };

  const updateCash = async (newCash: CashHolding[]) => {
      setCashHoldings(newCash);
      await StorageService.saveCash(newCash);
  };

  // --- DATA COMPUTATION ---

  useEffect(() => {
    let cancelled = false;
    const loadPortfolioHistory = async () => {
      if (!holdings.length) {
        if (!cancelled) setHistoryData([]);
        return;
      }
      
      try {
        // Fetch real historical data for all holdings + MSCI in parallel
        const allSymbols = [...holdings.map(h => h.symbol), 'URTH']; // URTH = MSCI World ETF
        const historyPromises = allSymbols.map(symbol => 
          fetchHistoricalPrices(symbol, timeRange)
            .then(result => ({ symbol, data: result.data }))
            .catch(err => {
              console.warn(`Failed to fetch ${symbol}:`, err);
              return { symbol, data: [] };
            })
        );
        
        const allHistory = await Promise.all(historyPromises);
        const historyMap = new Map(allHistory.map(h => [h.symbol, h.data]));
        
        // Get MSCI data
        const msciData = historyMap.get('URTH') || [];
        const msciBaseline = msciData.length > 0 ? msciData[0].price : 100;
        
        // Build timestamp map from all holdings
        const timestampMap = new Map<number, { date: string; pricesBySymbol: Map<string, number> }>();
        
        holdings.forEach(holding => {
          const data = historyMap.get(holding.symbol) || [];
          data.forEach(point => {
            if (!timestampMap.has(point.timestamp)) {
              timestampMap.set(point.timestamp, {
                date: point.date,
                pricesBySymbol: new Map(),
              });
            }
            timestampMap.get(point.timestamp)!.pricesBySymbol.set(holding.symbol, point.price);
          });
        });
        
        // Add MSCI timestamps
        msciData.forEach(point => {
          if (!timestampMap.has(point.timestamp)) {
            timestampMap.set(point.timestamp, {
              date: point.date,
              pricesBySymbol: new Map(),
            });
          }
        });
        
        const sortedTimestamps = Array.from(timestampMap.keys()).sort((a, b) => a - b);
        if (!sortedTimestamps.length) {
          if (!cancelled) setHistoryData([]);
          return;
        }
        
        // Track last known price for each symbol (forward fill gaps)
        const lastKnownPrices = new Map<string, number>();
        
        const points = sortedTimestamps.map(timestamp => {
          const { date, pricesBySymbol } = timestampMap.get(timestamp)!;
          const prices: Record<string, number> = {};
          let meValue = 0;
          let carolinaValue = 0;
          
          holdings.forEach(holding => {
            let price = pricesBySymbol.get(holding.symbol);
            if (price !== undefined) {
              lastKnownPrices.set(holding.symbol, price);
            } else {
              price = lastKnownPrices.get(holding.symbol);
            }
            
            if (price !== undefined) {
              prices[holding.symbol] = price;
              const value = holding.shares * price;
              if (holding.owner === PortfolioOwner.ME) {
                meValue += value;
              } else if (holding.owner === PortfolioOwner.CAROLINA) {
                carolinaValue += value;
              }
            }
          });
          
          const total = meValue + carolinaValue;
          
          // Get MSCI price for this timestamp
          const msciPoint = msciData.find(p => p.timestamp === timestamp);
          const msciPrice = msciPoint?.price || msciBaseline;
          
          return {
            date,
            Me: meValue,
            Carolina: carolinaValue,
            Total: total,
            MSCI: msciPrice,
            msciBaseline,
            prices,
          };
        }).filter(p => p.Total > 0);
        
        if (!cancelled) {
          setHistoryData(points);
        }
      } catch (error) {
        console.error('Failed to load portfolio history:', error);
        if (!cancelled) setHistoryData([]);
      }
    };
    
    loadPortfolioHistory();
    return () => {
      cancelled = true;
    };
  }, [holdings, timeRange]);

  useEffect(() => {
    if (holdings.length === 0) {
      if (selectedHolding) setSelectedHolding(null);
      return;
    }

    if (!selectedHolding) {
      setSelectedHolding(holdings[0]);
      return;
    }

    const updated = holdings.find(h => h.id === selectedHolding.id);
    if (!updated) {
      setSelectedHolding(holdings[0]);
    } else if (updated !== selectedHolding) {
      setSelectedHolding(updated);
    }
  }, [holdings, selectedHolding]);

  useEffect(() => {
    let cancelled = false;
    const loadHistory = async () => {
      if (!selectedHolding) {
        setHoldingHistory([]);
        setIsHoldingHistoryLoading(false);
        setHoldingLastUpdated(null);
        setHoldingSource(null);
        setHoldingError(null);
        return;
      }
      setIsHoldingHistoryLoading(true);
      setHoldingError(null);
      setHoldingLastUpdated(null);
      setHoldingSource(null);
      try {
        const result = await loadHoldingHistory(selectedHolding, holdingTimeRange);
        if (!cancelled) {
          setHoldingHistory(result.data);
          setHoldingLastUpdated(result.lastUpdated);
          setHoldingSource(result.source);
          const latestPoint = result.data[result.data.length - 1];
          const prevPoint = result.data.length > 1 ? result.data[result.data.length - 2] : latestPoint;
          const latestPrice = latestPoint
            ? (latestPoint.price ?? latestPoint.close ?? latestPoint.open ?? null)
            : null;
          const prevPrice = prevPoint
            ? (prevPoint.price ?? prevPoint.close ?? prevPoint.open ?? null)
            : null;

          if (latestPrice != null) {
            const computedChange =
              prevPrice && prevPrice !== 0
                ? ((latestPrice - prevPrice) / prevPrice) * 100
                : 0;

            setHoldings(prev =>
              prev.map(h =>
                h.id === selectedHolding.id
                  ? {
                      ...h,
                      currentPrice: latestPrice,
                      dayChangePercent: computedChange,
                    }
                  : h
              )
            );
          }
        }
      } catch (error: any) {
        if (!cancelled) {
          setHoldingHistory([]);
          setHoldingLastUpdated(null);
          setHoldingSource(null);
          setHoldingError(error?.message || 'Unable to fetch data from Yahoo Finance.');
        }
      } finally {
        if (!cancelled) {
          setIsHoldingHistoryLoading(false);
        }
      }
    };
    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [selectedHolding?.id, holdingTimeRange, holdings]);

  const filteredHoldings = useMemo(() => {
    if (activeTab === 'Total') return holdings;
    const targetOwner = activeTab === 'Me' ? PortfolioOwner.ME : PortfolioOwner.CAROLINA;
    return holdings.filter(h => h.owner === targetOwner);
  }, [holdings, activeTab]);

  const chartData = useMemo(() => {
    if (!historyData || historyData.length === 0) return [];

    type OwnerKey = 'Total' | PortfolioOwner;

    const baselinePrices = new Map<string, number>();
    historyData.forEach(point => {
      if (!point.prices) return;
      Object.entries(point.prices).forEach(([symbol, price]) => {
        if (!baselinePrices.has(symbol) && typeof price === 'number') {
          baselinePrices.set(symbol, price);
        }
      });
    });

    const ownerWeights: Record<OwnerKey, number> = {
      Total: 0,
      [PortfolioOwner.ME]: 0,
      [PortfolioOwner.CAROLINA]: 0,
    };

    holdings.forEach(holding => {
      const basePrice = baselinePrices.get(holding.symbol);
      if (!basePrice || !Number.isFinite(basePrice)) return;
      const weight = holding.shares * basePrice;
      ownerWeights.Total += weight;
      ownerWeights[holding.owner] += weight;
    });

    const holdingsByOwner: Record<OwnerKey, StockHolding[]> = {
      Total: holdings,
      [PortfolioOwner.ME]: holdings.filter(h => h.owner === PortfolioOwner.ME),
      [PortfolioOwner.CAROLINA]: holdings.filter(h => h.owner === PortfolioOwner.CAROLINA),
    };

    const computeOwnerPerf = (point: PortfolioHistoryPoint, owner: OwnerKey) => {
      const totalWeight = ownerWeights[owner];
      if (!totalWeight || !point.prices) return 0;
      const targetHoldings = holdingsByOwner[owner];
      let weightedReturn = 0;

      targetHoldings.forEach(holding => {
        const basePrice = baselinePrices.get(holding.symbol);
        const currentPrice = point.prices?.[holding.symbol];
        if (!basePrice || basePrice === 0 || typeof currentPrice !== 'number') return;
        const weight = holding.shares * basePrice;
        const priceReturn = (currentPrice - basePrice) / basePrice;
        weightedReturn += priceReturn * weight;
      });

      return (weightedReturn / totalWeight) * 100;
    };

    const msciBaseline = historyData[0]?.msciBaseline || historyData[0]?.MSCI || 100;

    return historyData.map(point => ({
      date: point.date,
      totalValue: point.Total,
      meValue: point.Me,
      carolinaValue: point.Carolina,
      totalPerf: computeOwnerPerf(point, 'Total'),
      mePerf: computeOwnerPerf(point, PortfolioOwner.ME),
      carolinaPerf: computeOwnerPerf(point, PortfolioOwner.CAROLINA),
      msciPerf: msciBaseline ? ((point.MSCI - msciBaseline) / msciBaseline) * 100 : 0,
    }));
  }, [historyData, holdings]);

  const metrics = useMemo(() => {
    // Portfolio value (investments only - for performance tracking)
    let portfolioValue = 0;
    let portfolioCost = 0;
    let dayChangeVal = 0;

    filteredHoldings.forEach(h => {
      const val = h.shares * h.currentPrice;
      const cost = h.shares * h.avgCost;
      portfolioValue += val;
      portfolioCost += cost;
      dayChangeVal += val * (h.dayChangePercent / 100);
    });

    // Cash value (doesn't affect portfolio performance)
    let cashValue = 0;
    const filteredCash = activeTab === 'Total' 
      ? cashHoldings 
      : cashHoldings.filter(c => c.owner === (activeTab === 'Me' ? PortfolioOwner.ME : PortfolioOwner.CAROLINA));
    
    filteredCash.forEach(c => {
      cashValue += c.amount;
    });

    // Total Net Worth = Portfolio + Cash
    const netWorth = portfolioValue + cashValue;

    // Portfolio performance (investments only, cash doesn't affect this)
    const totalReturn = portfolioValue - portfolioCost;
    const totalReturnPercent = portfolioCost > 0 ? (totalReturn / portfolioCost) * 100 : 0;

    return { 
      netWorth,           // Total including cash
      portfolioValue,     // Investments only
      cashValue,          // Cash only
      totalReturn,        // Investment gains/losses
      totalReturnPercent, // Investment performance %
      dayChangeVal        // Today's change
    };
  }, [filteredHoldings, cashHoldings, activeTab]);

  const lastUpdatedLabel = holdingLastUpdated ? new Date(holdingLastUpdated).toLocaleString() : null;

  // --- ACTIONS ---

  const refreshPrices = async () => {
    setIsRefreshing(true);
    const updatedHoldings = await Promise.all(holdings.map(async (h) => {
      try {
        const quote = await fetchStockQuote(h.symbol);
        return { 
          ...h, 
          currentPrice: quote.price, 
          dayChangePercent: quote.changePercent 
        };
      } catch (e) {
        return h;
      }
    }));
    updateHoldings(updatedHoldings);
    setIsRefreshing(false);
  };

  const handleSaveHolding = async (holding: Partial<StockHolding>) => {
    if (holding.id) {
        const updated = holdings.map(h => h.id === holding.id ? { ...h, ...holding } as StockHolding : h);
        updateHoldings(updated);
        setEditingHolding(null);
    } else {
        if (!holding.symbol) return;
        try {
          const quote = await fetchStockQuote(holding.symbol);
          
          const newHolding: StockHolding = {
            id: Math.random().toString(36).substring(7),
            symbol: holding.symbol.toUpperCase(),
            name: quote.name,
            shares: Number(holding.shares),
            avgCost: Number(holding.avgCost),
            currentPrice: quote.price,
            dayChangePercent: quote.changePercent,
            owner: holding.owner || PortfolioOwner.ME,
            type: holding.type || AssetType.STOCK
          };
          updateHoldings([...holdings, newHolding]);
          setIsAddModalOpen(false);
        } catch (error: any) {
          alert(error?.message || 'Unable to fetch Yahoo Finance quote. Please try again.');
        }
    }
  };

  const handleDeleteHolding = (id: string) => {
    if (window.confirm('Are you sure you want to delete this position?')) {
      updateHoldings(holdings.filter(h => h.id !== id));
    }
  };

  // --- NAV RENDERERS ---

  const NavButton = ({ view, icon: Icon }: { view: SubView, icon: any }) => (
    <button
      onClick={() => setSubView(view)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
        subView === view
          ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
          : 'text-slate-400 hover:text-white hover:bg-slate-800'
      }`}
    >
      <Icon size={16} />
      {view}
    </button>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* HEADER NAVIGATION */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
        <div className="flex bg-darker p-1.5 rounded-xl border border-slate-800">
          <NavButton view={SubView.OVERVIEW} icon={LayoutGrid} />
          <NavButton view={SubView.PROJECTIONS} icon={TrendingUp} />
        </div>
        {subView === SubView.OVERVIEW && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 hidden md:block">Last updated: Just now</span>
             <Button variant="ghost" onClick={refreshPrices} disabled={isRefreshing} className="h-9 w-9 p-0 rounded-lg border border-slate-700 bg-darker">
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
             </Button>
          </div>
        )}
      </div>

      {/* --- VIEW CONTENT --- */}
      
      {subView === SubView.OVERVIEW && (
        <>
          {/* OWNER TABS */}
          <div className="flex bg-darker p-1 rounded-lg border border-slate-800 w-full md:w-fit mb-6">
             <button onClick={() => setActiveTab('Total')} className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'Total' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Total</button>
             <button onClick={() => setActiveTab('Me')} className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'Me' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Me</button>
             <button onClick={() => setActiveTab('Carolina')} className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'Carolina' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Carolina</button>
          </div>

          {/* STATS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-500/20 via-slate-900 to-slate-900 border-indigo-500/30">
              <div className="relative z-10">
                <p className="text-indigo-300 font-medium mb-1 text-sm uppercase tracking-wide">Net Worth ({activeTab})</p>
                <h2 className="text-4xl font-bold text-white mb-2">
                  <Money value={metrics.netWorth} privacy={privacy} />
                </h2>
                <div className="text-xs text-slate-400 mt-2">
                  Portfolio: <Money value={metrics.portfolioValue} privacy={privacy} fractionDigits={0} /> + Cash: <Money value={metrics.cashValue} privacy={privacy} fractionDigits={0} />
                </div>
              </div>
              <div className="absolute -right-6 -bottom-6 text-indigo-500/10 z-0">
                 <Briefcase size={180} />
              </div>
            </Card>
            <Card>
              <p className="text-slate-400 font-medium mb-1 text-sm uppercase tracking-wide">Cash</p>
              <h2 className="text-3xl font-bold text-white mb-2">
                <Money value={metrics.cashValue} privacy={privacy} fractionDigits={0} />
              </h2>
              <Button onClick={() => setIsAddCashModalOpen(true)} className="text-xs h-7 mt-1">
                <Plus className="w-3 h-3" /> Add Cash
              </Button>
            </Card>
            <Card>
              <p className="text-slate-400 font-medium mb-1 text-sm uppercase tracking-wide">Portfolio Return</p>
              <div className="flex items-baseline gap-3">
                 <h2 className={`text-3xl font-bold`}>
                   <Money value={metrics.totalReturn} privacy={privacy} colored sign fractionDigits={0} />
                </h2>
                <span className={`text-sm font-medium px-2 py-0.5 rounded ${metrics.totalReturnPercent >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                  {metrics.totalReturnPercent >= 0 ? '+' : ''}{metrics.totalReturnPercent.toFixed(2)}%
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Investments only</p>
            </Card>
            <Card>
              <p className="text-slate-400 font-medium mb-1 text-sm uppercase tracking-wide">Today's Change</p>
              <h2 className={`text-3xl font-bold`}>
                <Money value={metrics.dayChangeVal} privacy={privacy} colored sign />
              </h2>
               <p className="text-xs text-slate-500 mt-2">Portfolio only</p>
            </Card>
          </div>

          {/* MAIN CHART */}
          <Card className="flex flex-col mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-1">Portfolio Performance</p>
                <p className="text-sm text-slate-400">Relative returns since start of selected period</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => setShowBenchmark(!showBenchmark)} className={`px-3 py-1.5 text-sm font-medium rounded-md border border-slate-700 flex items-center gap-2 transition-all ${showBenchmark ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50' : 'text-slate-400 hover:text-white bg-darker'}`}>
                  <Globe size={14} /> vs MSCI World
                </button>
                <div className="bg-darker p-1 rounded-lg border border-slate-800 flex items-center overflow-x-auto">
                  {Object.values(TimeRange).map(range => (
                    <button key={range} onClick={() => setTimeRange(range)} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${timeRange === range ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                      {range}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="h-[420px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} minTickGap={40} />
                  <YAxis
                    yAxisId="percent"
                    orientation="right"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${val.toFixed(0)}%`}
                  />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} 
                    itemStyle={{ color: '#f8fafc' }} 
                    formatter={(value: number, name, props) => {
                      return [`${Number(value).toFixed(2)}%`, name];
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />

                  {(activeTab === 'Total' || activeTab === 'Me') && (
                    <Line yAxisId="percent" type="monotone" dataKey="mePerf" name="Me %" stroke="#6366f1" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  )}
                  {(activeTab === 'Total' || activeTab === 'Carolina') && (
                    <Line yAxisId="percent" type="monotone" dataKey="carolinaPerf" name="Carolina %" stroke="#ec4899" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  )}
                  {activeTab === 'Total' && (
                    <Line yAxisId="percent" type="monotone" dataKey="totalPerf" name="Total %" stroke="#10b981" strokeWidth={3} dot={false} />
                  )}
                  {showBenchmark && (
                    <Line yAxisId="percent" type="monotone" dataKey="msciPerf" name="MSCI World" stroke="#fbbf24" strokeWidth={2} dot={false} />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* HOLDINGS TABLE */}
          <Card className="overflow-hidden p-0 mb-8">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Active Positions</h3>
              <Button onClick={() => setIsAddModalOpen(true)} className="text-xs h-8">
                <Plus className="w-3 h-3" /> Add Position
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900/50 text-xs uppercase text-slate-400 font-semibold">
                  <tr>
                    <th className="p-4 pl-6">Asset</th>
                    <th className="p-4 text-right">Price</th>
                    <th className="p-4 text-right">Shares</th>
                    <th className="p-4 text-right">Value</th>
                    <th className="p-4 text-right">Return</th>
                    <th className="p-4 text-center">Owner</th>
                    <th className="p-4 text-right pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredHoldings.map(h => {
                    const marketValue = h.shares * h.currentPrice;
                    const totalReturn = marketValue - (h.shares * h.avgCost);
                    const returnPercent = h.shares * h.avgCost > 0 ? (totalReturn / (h.shares * h.avgCost)) * 100 : 0;
                    return (
                      <tr 
                        key={h.id} 
                        onClick={() => setSelectedHolding(h)}
                        className={`hover:bg-white/5 transition-colors group cursor-pointer ${selectedHolding?.id === h.id ? 'bg-white/5' : ''}`}
                      >
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${h.type === AssetType.CRYPTO ? 'bg-orange-500/10 text-orange-500' : 'bg-slate-700 text-slate-300'}`}>
                              {h.type === AssetType.CRYPTO ? <Bitcoin size={20} /> : <Zap size={20} />}
                            </div>
                            <div>
                              <span className="block font-bold text-white flex items-center gap-2">
                                {h.symbol}
                                {h.type === AssetType.ETF && <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 rounded">ETF</span>}
                              </span>
                              <span className="block text-xs text-slate-500">{h.name}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="font-medium text-white"><Money value={h.currentPrice} privacy={privacy} /></div>
                          <div className={`text-xs ${h.dayChangePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {h.dayChangePercent >= 0 ? '+' : ''}{h.dayChangePercent.toFixed(2)}%
                          </div>
                        </td>
                        <td className="p-4 text-right text-slate-300">{h.shares}</td>
                        <td className="p-4 text-right font-bold text-white">
                          <Money value={marketValue} privacy={privacy} />
                        </td>
                        <td className="p-4 text-right">
                           <div className={`font-medium`}>
                             <Money value={totalReturn} privacy={privacy} colored sign fractionDigits={0} />
                          </div>
                          <div className={`text-xs ${returnPercent >= 0 ? 'text-emerald-500/70' : 'text-red-500/70'}`}>
                            {returnPercent.toFixed(1)}%
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <Badge color={h.owner === PortfolioOwner.ME ? 'bg-indigo-500/20 text-indigo-300' : 'bg-pink-500/20 text-pink-300'}>
                            {h.owner === PortfolioOwner.ME ? 'Me' : 'Carolina'}
                          </Badge>
                        </td>
                        <td className="p-4 text-right pr-6">
                           <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); setEditingHolding(h); }} className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition-colors"><Edit2 size={14} /></button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteHolding(h.id); }} className="p-1.5 hover:bg-red-500/20 rounded-md text-slate-400 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                           </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Stock Price Chart</h3>
                {(lastUpdatedLabel || holdingSource) && (
                  <div className="text-xs text-slate-500 mt-1 flex flex-col sm:flex-row sm:items-center gap-2">
                    {lastUpdatedLabel && <span>Last updated {lastUpdatedLabel}</span>}
                    {holdingSource && <span>Source: {holdingSource}</span>}
                  </div>
                )}
              </div>
              <div className="bg-darker p-1 rounded-lg border border-slate-800 flex items-center overflow-x-auto">
                {Object.values(TimeRange).map(range => (
                  <button 
                    key={range} 
                    onClick={() => setHoldingTimeRange(range)} 
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${holdingTimeRange === range ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
            {holdingError && (
              <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
                <p className="font-semibold mb-1">Unable to load Yahoo Finance data.</p>
                <p>{holdingError}</p>
              </div>
            )}
            {selectedHolding ? (
              isHoldingHistoryLoading ? (
                <div className="flex items-center justify-center py-12 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Loading chart...
                </div>
              ) : (
                holdingHistory.length === 0 ? (
                  <p className="text-slate-400 text-sm">No historical data available for this ticker.</p>
                ) : (
                  <>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                    <div>
                      <p className="text-slate-400 text-sm uppercase tracking-wide">Selected Position</p>
                      <div className="flex items-center gap-3 mt-1">
                        <h4 className="text-2xl font-bold text-white">{selectedHolding.symbol}</h4>
                        <Badge color={selectedHolding.owner === PortfolioOwner.ME ? 'bg-indigo-500/20 text-indigo-300' : 'bg-pink-500/20 text-pink-300'}>
                          {selectedHolding.owner === PortfolioOwner.ME ? 'Me' : 'Carolina'}
                        </Badge>
                      </div>
                      <p className="text-slate-500 text-sm">{selectedHolding.name}</p>
                      {holdingHistory.length > 0 && !privacy && (
                        <div className="mt-2">
                          {(() => {
                            const firstPrice = holdingHistory[0]?.price || 0;
                            const lastPrice = holdingHistory[holdingHistory.length - 1]?.price || 0;
                            const absoluteChange = lastPrice - firstPrice;
                            const percentChange = firstPrice !== 0 ? ((absoluteChange / firstPrice) * 100) : 0;
                            return (
                              <div className={`text-sm font-semibold ${absoluteChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {absoluteChange >= 0 ? '+' : ''}€{absoluteChange.toFixed(2)} ({percentChange >= 0 ? '+' : ''}{percentChange.toFixed(2)}%) in {holdingTimeRange}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-6 text-sm">
                      <div>
                        <p className="text-slate-400">Current Price</p>
                        <p className="text-white font-semibold">
                          <Money value={selectedHolding.currentPrice} privacy={privacy} />
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Value</p>
                        <p className="text-white font-semibold">
                          <Money value={selectedHolding.currentPrice * selectedHolding.shares} privacy={privacy} />
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Shares</p>
                        <p className="text-white font-semibold">{selectedHolding.shares}</p>
                      </div>
                    </div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={holdingHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="holdingGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} minTickGap={30} />
                        <YAxis 
                          stroke="#94a3b8" 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false} 
                          tickFormatter={(val) => privacy ? '' : `€${val}`}
                          domain={['dataMin - 1', 'dataMax + 1']}
                          scale="linear"
                        />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '12px' }}
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload.length || !holdingHistory.length) return null;
                            const current = payload[0].payload as PricePoint;
                            const currentPrice = current.price;
                            const currentIdx = holdingHistory.findIndex(p => p.timestamp === current.timestamp);
                            const firstPrice = holdingHistory[0]?.price || currentPrice;
                            
                            // Calculate change from start of period
                            const absoluteChange = currentPrice - firstPrice;
                            const percentChange = firstPrice !== 0 ? ((absoluteChange / firstPrice) * 100) : 0;
                            
                            // Calculate change from previous point
                            const prevPrice = currentIdx > 0 ? holdingHistory[currentIdx - 1]?.price : currentPrice;
                            const prevAbsoluteChange = currentPrice - prevPrice;
                            const prevPercentChange = prevPrice !== 0 ? ((prevAbsoluteChange / prevPrice) * 100) : 0;
                            
                            if (privacy) return <div style={{ color: '#f8fafc' }}>****</div>;
                            
                            return (
                              <div style={{ color: '#f8fafc', fontSize: '13px' }}>
                                <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #334155' }}>
                                  <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>{current.date}</div>
                                  <div style={{ fontWeight: 'bold', fontSize: '16px' }}>€{currentPrice.toFixed(2)}</div>
                                </div>
                                <div style={{ fontSize: '12px' }}>
                                  <div style={{ color: '#94a3b8', marginBottom: '2px' }}>Since period start:</div>
                                  <div style={{ color: absoluteChange >= 0 ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                                    {absoluteChange >= 0 ? '+' : ''}€{absoluteChange.toFixed(2)} ({percentChange >= 0 ? '+' : ''}{percentChange.toFixed(2)}%)
                                  </div>
                                  {currentIdx > 0 && (
                                    <>
                                      <div style={{ color: '#94a3b8', marginTop: '6px', marginBottom: '2px' }}>Previous point:</div>
                                      <div style={{ color: prevAbsoluteChange >= 0 ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                                        {prevAbsoluteChange >= 0 ? '+' : ''}€{prevAbsoluteChange.toFixed(2)} ({prevPercentChange >= 0 ? '+' : ''}{prevPercentChange.toFixed(2)}%)
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Area type="monotone" dataKey="price" stroke="#6366f1" fill="url(#holdingGradient)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  </>
                )
              )
            ) : (
              <p className="text-slate-400 text-sm">Select a position from the table above to view its performance chart.</p>
            )}
          </Card>

          {/* NEWS SECTION */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-400 uppercase text-xs font-bold tracking-wider">
              <Newspaper size={14} />
              <span>Relevant News for your Assets</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {news.map(item => (
                 <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="group block">
                   <Card className="h-full p-0 overflow-hidden hover:border-primary/50 transition-colors">
                      <div className="h-32 bg-slate-800 relative overflow-hidden">
                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute top-3 right-3">
                           <Badge color={item.sentiment === 'POSITIVE' ? 'bg-emerald-500 text-white' : item.sentiment === 'NEGATIVE' ? 'bg-red-500 text-white' : 'bg-slate-500 text-white'}>
                             {item.sentiment}
                           </Badge>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex gap-2 mb-2">
                          {item.relatedTickers.map(t => <span key={t} className="text-[10px] font-bold bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">{t}</span>)}
                        </div>
                        <h4 className="font-semibold text-white mb-2 line-clamp-2 group-hover:text-primary transition-colors">{item.title}</h4>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>{item.source}</span>
                          <span>{item.time}</span>
                        </div>
                      </div>
                   </Card>
                 </a>
               ))}
            </div>
          </div>
        </>
      )}

      {subView === SubView.PROJECTIONS && (
        <WealthCalculator currentTotal={metrics.totalValue} privacy={privacy} />
      )}

      {/* ADD/EDIT MODAL */}
      {(isAddModalOpen || editingHolding) && (
        <HoldingModal 
          onClose={() => { setIsAddModalOpen(false); setEditingHolding(null); }} 
          onSave={handleSaveHolding} 
          initialData={editingHolding || undefined}
        />
      )}

      {/* ADD CASH MODAL */}
      {isAddCashModalOpen && (
        <CashModal
          onClose={() => setIsAddCashModalOpen(false)}
          onSave={(cash) => {
            const newCash = [...cashHoldings, cash];
            updateCash(newCash);
            setIsAddCashModalOpen(false);
          }}
          existingCash={cashHoldings}
        />
      )}
    </div>
  );
};

// --- SUB-VIEWS COMPONENTS ---

const WealthCalculator: React.FC<{ currentTotal: number, privacy: boolean }> = ({ currentTotal, privacy }) => {
  const [monthlyContribution, setMonthlyContribution] = useState(2000);
  const [annualReturn, setAnnualReturn] = useState(8);
  const [years, setYears] = useState(20);

  const projectionData = useMemo(() => {
    const data = [];
    let balance = currentTotal;
    let totalInvested = currentTotal;

    const monthlyRate = annualReturn / 100 / 12;

    for (let i = 0; i <= years; i++) {
      data.push({
        year: new Date().getFullYear() + i,
        balance: Math.round(balance),
        invested: Math.round(totalInvested),
        interest: Math.round(balance - totalInvested)
      });

      // Compound for next year
      for (let m = 0; m < 12; m++) {
        balance = (balance + monthlyContribution) * (1 + monthlyRate);
        totalInvested += monthlyContribution;
      }
    }
    return data;
  }, [currentTotal, monthlyContribution, annualReturn, years]);

  const finalAmount = projectionData[projectionData.length - 1].balance;
  const finalInterest = projectionData[projectionData.length - 1].interest;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* CONTROLS */}
      <div className="space-y-6">
        <Card title="Projection Parameters">
           <div className="space-y-6">
             <div>
               <div className="flex justify-between mb-2">
                 <label className="text-sm text-slate-400">Monthly Contribution</label>
                 <span className="font-bold text-white"><Money value={monthlyContribution} privacy={privacy} fractionDigits={0} /></span>
               </div>
               <input type="range" min="0" max="10000" step="100" value={monthlyContribution} onChange={(e) => setMonthlyContribution(Number(e.target.value))} className="w-full accent-primary h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
             </div>

             <div>
               <div className="flex justify-between mb-2">
                 <label className="text-sm text-slate-400">Expected Annual Return</label>
                 <span className="font-bold text-white">{annualReturn}%</span>
               </div>
               <input type="range" min="1" max="15" step="0.5" value={annualReturn} onChange={(e) => setAnnualReturn(Number(e.target.value))} className="w-full accent-primary h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
               <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                 <span>Conservative (3%)</span>
                 <span>S&P500 Avg (10%)</span>
                 <span>Aggressive (15%)</span>
               </div>
             </div>

             <div>
               <div className="flex justify-between mb-2">
                 <label className="text-sm text-slate-400">Time Horizon</label>
                 <span className="font-bold text-white">{years} Years</span>
               </div>
               <input type="range" min="5" max="40" step="1" value={years} onChange={(e) => setYears(Number(e.target.value))} className="w-full accent-primary h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
             </div>
           </div>
        </Card>

        <Card className="bg-gradient-to-br from-primary/20 to-purple-500/20 border-primary/30">
          <div className="text-center py-4">
             <p className="text-slate-300 text-sm mb-2">Projected Wealth in {years} Years</p>
             <h2 className="text-4xl font-bold text-white mb-4"><Money value={finalAmount} privacy={privacy} fractionDigits={0} /></h2>
             <div className="inline-block bg-black/30 px-4 py-2 rounded-lg text-sm">
                <span className="text-slate-400">Total Interest Earned: </span>
                <span className="text-emerald-400 font-bold">+<Money value={finalInterest} privacy={privacy} fractionDigits={0} currency="" /></span>
             </div>
          </div>
        </Card>
      </div>

      {/* CHART */}
      <Card className="lg:col-span-2 flex flex-col">
        <h3 className="text-lg font-bold text-white mb-6">Wealth Growth Trajectory</h3>
        <div className="flex-1 min-h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projectionData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
               <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                  </linearGradient>
               </defs>
               <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
               <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
               <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => privacy ? '' : `€${val/1000}k`} />
               <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} 
                  formatter={(val: number) => [privacy ? '****' : `€${val.toLocaleString()}`]}
                  labelFormatter={(label) => `Year ${label}`}
                />
               <Legend verticalAlign="top" height={36} />
               <Area type="monotone" name="Total Wealth" dataKey="balance" stroke="#6366f1" fill="url(#colorBalance)" strokeWidth={3} />
               <Area type="monotone" name="Principal Invested" dataKey="invested" stroke="#94a3b8" fill="url(#colorInvested)" strokeWidth={2} strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

// --- HOLDING MODAL (UPDATED) ---

const HoldingModal: React.FC<{ 
    onClose: () => void; 
    onSave: (h: Partial<StockHolding>) => Promise<void>; 
    initialData?: StockHolding 
}> = ({ onClose, onSave, initialData }) => {
  const [symbol, setSymbol] = useState(initialData?.symbol || '');
  const [shares, setShares] = useState(initialData?.shares.toString() || '');
  const [avgCost, setAvgCost] = useState(initialData?.avgCost.toString() || '');
  const [owner, setOwner] = useState<PortfolioOwner>(initialData?.owner || PortfolioOwner.ME);
  const [type, setType] = useState<AssetType>(initialData?.type || AssetType.STOCK);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSave({ 
        id: initialData?.id,
        symbol, 
        shares: Number(shares), 
        avgCost: Number(avgCost), 
        owner,
        type
    });
    setLoading(false);
  };

  return (
     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md relative animate-in fade-in zoom-in duration-200">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-500 hover:text-white">
           <X size={20} />
        </button>
        <h2 className="text-xl font-bold text-white mb-6">{initialData ? 'Edit Position' : 'Add Asset'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Asset Type</label>
             <div className="flex bg-darker p-1 rounded-lg border border-slate-700">
              <button type="button" onClick={() => setType(AssetType.STOCK)} className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors ${type === AssetType.STOCK ? 'bg-slate-600 text-white' : 'text-slate-400'}`}>Stock</button>
              <button type="button" onClick={() => setType(AssetType.ETF)} className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors ${type === AssetType.ETF ? 'bg-slate-600 text-white' : 'text-slate-400'}`}>ETF</button>
              <button type="button" onClick={() => setType(AssetType.CRYPTO)} className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors ${type === AssetType.CRYPTO ? 'bg-slate-600 text-white' : 'text-slate-400'}`}>Crypto</button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Ticker Symbol</label>
            <Input 
                value={symbol} 
                onChange={(e) => setSymbol(e.target.value.toUpperCase())} 
                placeholder="e.g. AAPL, BTC-USD" 
                required 
                className="uppercase placeholder:normal-case"
                disabled={!!initialData}
              />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Units/Shares</label>
              <Input 
                type="number" 
                step="0.000001" 
                value={shares} 
                onChange={(e) => setShares(e.target.value)} 
                placeholder="0" 
                required 
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Avg. Cost</label>
              <Input 
                type="number" 
                step="0.01" 
                value={avgCost} 
                onChange={(e) => setAvgCost(e.target.value)} 
                placeholder="€0.00" 
                required 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Owner</label>
            <div className="flex bg-darker p-1 rounded-lg border border-slate-700">
              <button 
                type="button"
                onClick={() => setOwner(PortfolioOwner.ME)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${owner === PortfolioOwner.ME ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Me
              </button>
              <button 
                type="button"
                onClick={() => setOwner(PortfolioOwner.CAROLINA)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${owner === PortfolioOwner.CAROLINA ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Carolina
              </button>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Saving...' : (initialData ? 'Update' : 'Add Asset')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
};

// --- CASH MODAL ---
const CashModal: React.FC<{
  onClose: () => void;
  onSave: (cash: CashHolding) => void;
  existingCash: CashHolding[];
}> = ({ onClose, onSave, existingCash }) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [owner, setOwner] = useState<PortfolioOwner>(PortfolioOwner.ME);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newCash: CashHolding = {
      id: Math.random().toString(36).substring(7),
      name: name || `${currency} Cash`,
      amount: Number(amount),
      currency,
      owner,
    };
    onSave(newCash);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md relative animate-in fade-in zoom-in duration-200">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-500 hover:text-white">
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold text-white mb-6">Add Cash</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Description (Optional)</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Savings Account, Emergency Fund"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Amount</label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Currency</label>
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
              <option value="CHF">CHF</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Owner</label>
            <div className="flex bg-darker p-1 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setOwner(PortfolioOwner.ME)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${owner === PortfolioOwner.ME ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Me
              </button>
              <button
                type="button"
                onClick={() => setOwner(PortfolioOwner.CAROLINA)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${owner === PortfolioOwner.CAROLINA ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Carolina
              </button>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1">Add Cash</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
