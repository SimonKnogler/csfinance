import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, Loader2, BrainCircuit } from 'lucide-react';
import { Transaction, FinancialInsight } from '../types';
import { generateFinancialInsights } from '../services/geminiService';
import { Card, Button } from './UIComponents';

interface Props {
  transactions: Transaction[];
}

export const AIInsights: React.FC<Props> = ({ transactions }) => {
  const [insights, setInsights] = useState<FinancialInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await generateFinancialInsights(transactions);
      if (result) {
        setInsights(result);
      } else {
        setError("Could not generate insights. Check API Key or try again.");
      }
    } catch (e) {
      setError("Failed to connect to FinanceCS AI.");
    } finally {
      setLoading(false);
    }
  };

  if (!insights && !loading) {
    return (
      <Card className="relative overflow-hidden bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
        <div className="flex flex-col items-center justify-center text-center py-8">
          <div className="bg-primary/20 p-4 rounded-full mb-4">
            <BrainCircuit className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Unlock FinanceCS AI Intelligence</h3>
          <p className="text-slate-400 mb-6 max-w-md">
            Let our Gemini-powered AI analyze your spending patterns, find savings, and detect anomalies in your financial health.
          </p>
          <Button onClick={handleAnalyze} disabled={transactions.length === 0}>
            <Sparkles className="w-4 h-4" />
            Generate Insights
          </Button>
          {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-slate-400 animate-pulse">FinanceCS AI is analyzing your ledger...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-slate-900 to-slate-800 border-primary/30">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-white">AI Financial Analysis</h3>
        </div>
        <Button variant="ghost" onClick={() => setInsights(null)} className="text-xs">Reset</Button>
      </div>

      <div className="space-y-6">
        <div className="p-4 bg-white/5 rounded-lg border border-white/5">
          <p className="text-slate-200 leading-relaxed">{insights?.summary}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-2 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
              <span className="font-medium text-sm">Predicted Next Month</span>
            </div>
            <p className="text-2xl font-bold text-white">€{insights?.predictedNextMonthSpending.toLocaleString()}</p>
          </div>

          <div className={`p-4 rounded-lg border ${insights?.anomalyDetected ? 'bg-red-500/10 border-red-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
             <div className={`flex items-center gap-2 mb-2 ${insights?.anomalyDetected ? 'text-red-400' : 'text-blue-400'}`}>
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium text-sm">Anomaly Detection</span>
            </div>
            <p className="text-white text-sm">
              {insights?.anomalyDetected ? 'Unusual spending patterns detected.' : 'Spending appears normal.'}
            </p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Actionable Tips</h4>
          <ul className="space-y-2">
            {insights?.actionableTips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-3 p-3 rounded bg-darker border border-slate-800">
                <div className="min-w-[20px] h-[20px] rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5">
                  {idx + 1}
                </div>
                <span className="text-slate-300 text-sm">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
};