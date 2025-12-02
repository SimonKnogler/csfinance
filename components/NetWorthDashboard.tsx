import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  Wallet,
  Building2,
  Briefcase,
  PiggyBank,
  RefreshCw
} from 'lucide-react';
import { StockHolding, CashHolding, RealEstateProperty } from '../types';
import { StorageService } from '../services/storageService';
import { fetchStockQuote } from '../services/yahooFinanceService';
import { Card, Money } from './UIComponents';

interface NetWorthDashboardProps {
  privacy: boolean;
  onNavigate?: (view: string) => void;
}

export const NetWorthDashboard: React.FC<NetWorthDashboardProps> = ({ privacy, onNavigate }) => {
  const [holdings, setHoldings] = useState<StockHolding[]>([]);
  const [cashHoldings, setCashHoldings] = useState<CashHolding[]>([]);
  const [realEstateHoldings, setRealEstateHoldings] = useState<RealEstateProperty[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load all data
  useEffect(() => {
    const load = async () => {
      const portfolio = await StorageService.getPortfolio();
      setHoldings(portfolio);
      const cash = await StorageService.getCash();
      setCashHoldings(cash);
      const realEstate = await StorageService.getRealEstate();
      setRealEstateHoldings(realEstate);
      setLastUpdated(new Date());
    };
    load();
  }, []);

  // Refresh prices
  const refreshPrices = async () => {
    setIsRefreshing(true);
    try {
      const updatedHoldings = await Promise.all(holdings.map(async (h) => {
        try {
          const quote = await fetchStockQuote(h.symbol);
          return {
            ...h,
            currentPrice: quote.price,
            dayChangePercent: quote.changePercent,
          };
        } catch {
          return h;
        }
      }));
      setHoldings(updatedHoldings);
      await StorageService.savePortfolio(updatedHoldings);
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  };

  // Calculate totals
  const totals = useMemo(() => {
    // Portfolio value
    const portfolioValue = holdings.reduce((sum, h) => sum + (h.shares * h.currentPrice), 0);
    const portfolioCost = holdings.reduce((sum, h) => sum + (h.shares * h.avgCost), 0);
    const portfolioGain = portfolioValue - portfolioCost;
    const portfolioGainPercent = portfolioCost > 0 ? (portfolioGain / portfolioCost) * 100 : 0;

    // Cash value
    const cashValue = cashHoldings.reduce((sum, c) => sum + c.amount, 0);

    // Real Estate equity (value - debt)
    const realEstateValue = realEstateHoldings.reduce((sum, p) => sum + p.currentValue, 0);
    const realEstateDebt = realEstateHoldings.reduce((sum, p) => sum + p.loanAmount, 0);
    const realEstateEquity = realEstateValue - realEstateDebt;

    // Total net worth
    const netWorth = portfolioValue + cashValue + realEstateEquity;

    return {
      portfolioValue,
      portfolioGain,
      portfolioGainPercent,
      cashValue,
      realEstateValue,
      realEstateDebt,
      realEstateEquity,
      netWorth,
    };
  }, [holdings, cashHoldings, realEstateHoldings]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Net Worth</h1>
          <p className="text-slate-400 text-sm">
            {lastUpdated 
              ? `Zuletzt aktualisiert: ${lastUpdated.toLocaleTimeString('de-DE')}`
              : 'Laden...'
            }
          </p>
        </div>
        <button
          onClick={refreshPrices}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Aktualisieren
        </button>
      </div>

      {/* Main Net Worth Display */}
      <Card className="text-center py-12 bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700">
        <p className="text-slate-400 text-lg mb-2 uppercase tracking-wider">Gesamtvermögen</p>
        <div className="text-6xl font-bold text-white mb-4">
          <Money value={totals.netWorth} privacy={privacy} fractionDigits={0} />
        </div>
        <div className={`flex items-center justify-center gap-2 text-lg ${totals.portfolioGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {totals.portfolioGain >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          <span>
            {totals.portfolioGain >= 0 ? '+' : ''}
            <Money value={totals.portfolioGain} privacy={privacy} fractionDigits={0} />
          </span>
          <span className="text-slate-500">
            ({totals.portfolioGainPercent >= 0 ? '+' : ''}{totals.portfolioGainPercent.toFixed(1)}% Portfolio)
          </span>
        </div>
      </Card>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Portfolio */}
        <div 
          className="cursor-pointer hover:scale-[1.02] transition-all"
          onClick={() => onNavigate?.('portfolio')}
        >
          <Card className="h-full hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Briefcase size={24} className="text-white" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Portfolio</p>
                <p className="text-xs text-slate-500">{holdings.length} Positionen</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              <Money value={totals.portfolioValue} privacy={privacy} fractionDigits={0} />
            </p>
            <p className={`text-sm ${totals.portfolioGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totals.portfolioGain >= 0 ? '+' : ''}<Money value={totals.portfolioGain} privacy={privacy} fractionDigits={0} />
              {' '}({totals.portfolioGainPercent >= 0 ? '+' : ''}{totals.portfolioGainPercent.toFixed(1)}%)
            </p>
          </Card>
        </div>

        {/* Real Estate */}
        <div 
          className="cursor-pointer hover:scale-[1.02] transition-all"
          onClick={() => onNavigate?.('real-estate')}
        >
          <Card className="h-full hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Building2 size={24} className="text-white" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Immobilien</p>
                <p className="text-xs text-slate-500">{realEstateHoldings.length} Objekte</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              <Money value={totals.realEstateEquity} privacy={privacy} fractionDigits={0} />
            </p>
            <p className="text-sm text-slate-400">
              Wert: <Money value={totals.realEstateValue} privacy={privacy} fractionDigits={0} />
              {' '}| Schulden: <Money value={totals.realEstateDebt} privacy={privacy} fractionDigits={0} />
            </p>
          </Card>
        </div>

        {/* Cash */}
        <div 
          className="cursor-pointer hover:scale-[1.02] transition-all"
          onClick={() => onNavigate?.('portfolio')}
        >
          <Card className="h-full hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <PiggyBank size={24} className="text-white" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Cash</p>
                <p className="text-xs text-slate-500">{cashHoldings.length} Konten</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              <Money value={totals.cashValue} privacy={privacy} fractionDigits={0} />
            </p>
            <p className="text-sm text-slate-400">
              Liquidität
            </p>
          </Card>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <p className="text-slate-400 text-xs uppercase mb-1">Portfolio %</p>
          <p className="text-xl font-bold text-indigo-400">
            {totals.netWorth > 0 ? ((totals.portfolioValue / totals.netWorth) * 100).toFixed(1) : 0}%
          </p>
        </Card>
        <Card className="text-center">
          <p className="text-slate-400 text-xs uppercase mb-1">Immobilien %</p>
          <p className="text-xl font-bold text-amber-400">
            {totals.netWorth > 0 ? ((totals.realEstateEquity / totals.netWorth) * 100).toFixed(1) : 0}%
          </p>
        </Card>
        <Card className="text-center">
          <p className="text-slate-400 text-xs uppercase mb-1">Cash %</p>
          <p className="text-xl font-bold text-emerald-400">
            {totals.netWorth > 0 ? ((totals.cashValue / totals.netWorth) * 100).toFixed(1) : 0}%
          </p>
        </Card>
        <Card className="text-center">
          <p className="text-slate-400 text-xs uppercase mb-1">Immobilien LTV</p>
          <p className="text-xl font-bold text-red-400">
            {totals.realEstateValue > 0 ? ((totals.realEstateDebt / totals.realEstateValue) * 100).toFixed(1) : 0}%
          </p>
        </Card>
      </div>
    </div>
  );
};

export default NetWorthDashboard;

