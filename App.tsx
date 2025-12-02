
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  CreditCard, 
  PieChart as PieIcon, 
  Settings as SettingsIcon, 
  Plus, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Search,
  Wand2,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Banknote,
  FileText,
  Eye,
  EyeOff,
  LogOut,
  Loader2,
  Building2
} from 'lucide-react';
import { Transaction, TransactionType, Category, PortfolioDocument } from './types';
import { OverviewChart, CategoryPieChart, MonthlyBarChart } from './components/Charts';
import { Card, Button, Input, Select, Badge, Money } from './components/UIComponents';
import { AIInsights } from './components/AIInsights';
import { Portfolio } from './components/Portfolio';
import { RealEstate } from './components/RealEstate';
import { RentalTaxCalculator } from './components/RentalTaxCalculator';
import { Documents } from './components/Documents';
import { Auth } from './components/Auth';
import { Settings } from './components/Settings';
import { autoCategorizeTransaction } from './services/geminiService';
import { StorageService } from './services/storageService';

// --- MOCK DATA FALLBACK ---
const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', date: '2023-10-25', amount: 4500, type: TransactionType.INCOME, category: Category.INCOME, description: 'Monthly Salary' },
  { id: '2', date: '2023-10-26', amount: 45.50, type: TransactionType.EXPENSE, category: Category.TRANSPORT, description: 'Uber Ride' },
  { id: '3', date: '2023-10-27', amount: 120.00, type: TransactionType.EXPENSE, category: Category.FOOD, description: 'Dinner at Nobu' },
  { id: '4', date: '2023-10-28', amount: 15.99, type: TransactionType.EXPENSE, category: Category.ENTERTAINMENT, description: 'Netflix Subscription' },
  { id: '5', date: '2023-10-29', amount: 250.00, type: TransactionType.EXPENSE, category: Category.SHOPPING, description: 'Nike Sneakers' },
  { id: '6', date: '2023-10-30', amount: 80.00, type: TransactionType.EXPENSE, category: Category.UTILITIES, description: 'Electric Bill' },
  { id: '7', date: '2023-10-15', amount: 200.00, type: TransactionType.INCOME, category: Category.INCOME, description: 'Freelance Project' },
  { id: '8', date: '2023-10-10', amount: 3000.00, type: TransactionType.EXPENSE, category: Category.HOUSING, description: 'Rent Payment' },
];

enum View {
  DASHBOARD = 'dashboard',
  TRANSACTIONS = 'transactions',
  PORTFOLIO = 'portfolio',
  REAL_ESTATE = 'real-estate',
  INCOME = 'income',
  EXPENSES = 'expenses',
  DOCUMENTS = 'documents',
  SETTINGS = 'settings',
}

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const auth = await StorageService.isAuthenticated();
      setIsAuthenticated(auth);
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-darker flex items-center justify-center flex-col gap-4">
         <Loader2 className="w-10 h-10 text-primary animate-spin" />
         <p className="text-slate-400">Initializing Safe Storage...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth onLogin={() => setIsAuthenticated(true)} />;
  }

  return <AuthenticatedApp onLogout={() => setIsAuthenticated(false)} />;
};

const AuthenticatedApp: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [activeView, setActiveView] = useState<View>(View.DASHBOARD);
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [documents, setDocuments] = useState<PortfolioDocument[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);

  // Initial Data Load
  useEffect(() => {
    const loadData = async () => {
      setIsDataLoading(true);
      const [txs, docs] = await Promise.all([
        StorageService.getTransactions(),
        StorageService.getDocuments()
      ]);
      
      setTransactions(txs.length > 0 ? txs : MOCK_TRANSACTIONS);
      setDocuments(docs);
      setIsDataLoading(false);
    };
    loadData();
  }, []);

  // Save handlers (Async)
  const handleSaveTransactions = async (newTransactions: Transaction[]) => {
    setTransactions(newTransactions);
    await StorageService.saveTransactions(newTransactions);
  };

  const handleSaveDocuments = async (newDocs: PortfolioDocument[]) => {
    setDocuments(newDocs);
    await StorageService.saveDocuments(newDocs);
  };

  // --- COMPUTED STATES ---
  const totalBalance = useMemo(() => transactions.reduce((acc, t) => t.type === TransactionType.INCOME ? acc + t.amount : acc - t.amount, 0), [transactions]);
  const totalIncome = useMemo(() => transactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0), [transactions]);
  const totalExpense = useMemo(() => transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0), [transactions]);

  // --- HANDLERS ---
  const handleAddTransaction = (t: Omit<Transaction, 'id'>) => {
    const newT = { ...t, id: Math.random().toString(36).substring(7) };
    const updated = [newT, ...transactions];
    handleSaveTransactions(updated);
    setIsModalOpen(false);
  };

  const handleAddDocument = (doc: PortfolioDocument) => {
    const updated = [doc, ...documents];
    handleSaveDocuments(updated);
  };

  const handleDeleteDocument = (id: string) => {
    if (window.confirm('Delete this document permanently?')) {
      const updated = documents.filter(d => d.id !== id);
      handleSaveDocuments(updated);
    }
  };

  const handleLogout = async () => {
    await StorageService.logout();
    onLogout();
  };

  if (isDataLoading) {
     return (
      <div className="h-screen w-screen bg-darker flex items-center justify-center">
         <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-darker text-slate-200 font-sans overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-64 hidden md:flex flex-col border-r border-slate-800 bg-dark p-4">
        <div className="flex items-center gap-3 px-2 mb-8 mt-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
            <Wallet className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            FinanceCS
          </span>
        </div>

        <nav className="space-y-1 flex-1">
          <SidebarItem 
            icon={<LayoutDashboard />} 
            label="Dashboard" 
            active={activeView === View.DASHBOARD} 
            onClick={() => setActiveView(View.DASHBOARD)} 
          />
          <SidebarItem 
            icon={<CreditCard />} 
            label="Transactions" 
            active={activeView === View.TRANSACTIONS} 
            onClick={() => setActiveView(View.TRANSACTIONS)} 
          />
           <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
             Wealth
           </div>
          <SidebarItem 
            icon={<Briefcase />} 
            label="Portfolio" 
            active={activeView === View.PORTFOLIO} 
            onClick={() => setActiveView(View.PORTFOLIO)} 
          />
          <SidebarItem 
            icon={<Building2 />} 
            label="Immobilien" 
            active={activeView === View.REAL_ESTATE} 
            onClick={() => setActiveView(View.REAL_ESTATE)} 
          />
          <SidebarItem 
            icon={<TrendingUp />} 
            label="Income" 
            active={activeView === View.INCOME} 
            onClick={() => setActiveView(View.INCOME)} 
          />
          <SidebarItem 
            icon={<TrendingDown />} 
            label="Expenses" 
            active={activeView === View.EXPENSES} 
            onClick={() => setActiveView(View.EXPENSES)} 
          />
          <SidebarItem 
            icon={<FileText />} 
            label="Documents" 
            active={activeView === View.DOCUMENTS} 
            onClick={() => setActiveView(View.DOCUMENTS)} 
          />
          <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
             System
          </div>
          <SidebarItem 
            icon={<SettingsIcon />} 
            label="Settings & Data" 
            active={activeView === View.SETTINGS} 
            onClick={() => setActiveView(View.SETTINGS)} 
          />
        </nav>

        <div className="space-y-4">
          <button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm px-2">
            <LogOut size={16} /> Sign Out
          </button>

          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 mt-auto">
            <p className="text-xs text-slate-400 mb-1">Monthly Budget</p>
            <div className="flex justify-between items-end mb-2">
              <span className="text-lg font-bold text-white">68%</span>
              <span className="text-xs text-slate-400">Left</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
              <div className="bg-primary h-full rounded-full" style={{ width: '68%' }}></div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* HEADER */}
        <header className="h-16 border-b border-slate-800 bg-dark/50 backdrop-blur-md flex items-center justify-between px-8 z-10">
          <h1 className="text-xl font-semibold text-white capitalize">{activeView.replace('-', ' ')}</h1>
          <div className="flex items-center gap-4">
            
            {/* Privacy Toggle */}
            <button 
              onClick={() => setIsPrivacyMode(!isPrivacyMode)} 
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              title={isPrivacyMode ? "Show Values" : "Hide Values"}
            >
              {isPrivacyMode ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>

            {activeView !== View.PORTFOLIO && activeView !== View.REAL_ESTATE && activeView !== View.DOCUMENTS && activeView !== View.SETTINGS && (
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="w-4 h-4" />
                Add Transaction
              </Button>
            )}
            <div className="w-10 h-10 rounded-full bg-slate-700 border border-slate-600 overflow-hidden">
              <img src="https://picsum.photos/40/40" alt="User" className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </header>

        {/* SCROLLABLE AREA */}
        <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
          {activeView === View.DASHBOARD && (
            <div className="space-y-8 max-w-7xl mx-auto">
              {/* STATS ROW */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Balance" value={totalBalance} icon={<Wallet className="text-white" />} trend="+2.5%" trendUp={true} privacy={isPrivacyMode} />
                <StatCard title="Monthly Income" value={totalIncome} icon={<ArrowDownRight className="text-emerald-400" />} trend="+12%" trendUp={true} privacy={isPrivacyMode} />
                <StatCard title="Monthly Expenses" value={totalExpense} icon={<ArrowUpRight className="text-red-400" />} trend="+4%" trendUp={false} privacy={isPrivacyMode} />
              </div>

              {/* MAIN CHART & INSIGHTS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card title="Cash Flow Overview" className="lg:col-span-2">
                  <OverviewChart transactions={transactions} privacy={isPrivacyMode} />
                </Card>
                <div className="space-y-6">
                   <AIInsights transactions={transactions} />
                   <Card title="Expense Breakdown">
                     <CategoryPieChart transactions={transactions} privacy={isPrivacyMode} />
                   </Card>
                </div>
              </div>

              {/* RECENT TRANSACTIONS */}
              <Card title="Recent Transactions">
                <TransactionTable transactions={transactions.slice(0, 5)} privacy={isPrivacyMode} />
              </Card>
            </div>
          )}

          {activeView === View.TRANSACTIONS && (
            <div className="max-w-7xl mx-auto space-y-6">
              <Card>
                <div className="flex items-center justify-between mb-6">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input placeholder="Search transactions..." className="pl-10" />
                  </div>
                  <div className="flex gap-2">
                    <Select className="w-40">
                      <option>All Categories</option>
                      {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                    </Select>
                  </div>
                </div>
                <TransactionTable transactions={transactions} privacy={isPrivacyMode} />
              </Card>
            </div>
          )}

          {activeView === View.PORTFOLIO && (
             <div className="max-w-7xl mx-auto">
                <Portfolio privacy={isPrivacyMode} />
             </div>
          )}

          {activeView === View.REAL_ESTATE && (
             <div className="max-w-7xl mx-auto">
                <RealEstate privacy={isPrivacyMode} />
             </div>
          )}

          {activeView === View.INCOME && (
            <div className="max-w-7xl mx-auto space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Income (YTD)" value={totalIncome * 12} icon={<Banknote className="text-emerald-400" />} trend="+8.5%" trendUp={true} privacy={isPrivacyMode} />
                <StatCard title="Average Monthly" value={totalIncome} icon={<TrendingUp className="text-emerald-400" />} trend="+2%" trendUp={true} privacy={isPrivacyMode} />
                <Card className="flex flex-col justify-center">
                  <p className="text-slate-400 text-sm font-medium mb-2">Top Source</p>
                  <h3 className="text-2xl font-bold text-white">Salary & Income</h3>
                  <div className="w-full bg-slate-700 rounded-full h-2 mt-3 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </Card>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card title="Income Trend" className="lg:col-span-2">
                    <MonthlyBarChart transactions={transactions} type={TransactionType.INCOME} privacy={isPrivacyMode} />
                  </Card>
                  <Card title="Sources">
                    <CategoryPieChart transactions={transactions} type={TransactionType.INCOME} privacy={isPrivacyMode} />
                  </Card>
               </div>

               <Card title="Recent Income">
                 <TransactionTable transactions={transactions.filter(t => t.type === TransactionType.INCOME)} privacy={isPrivacyMode} />
               </Card>

               {/* Rental Income Tax Calculator */}
               <RentalTaxCalculator privacy={isPrivacyMode} />
            </div>
          )}

          {activeView === View.EXPENSES && (
            <div className="max-w-7xl mx-auto space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Expenses (YTD)" value={totalExpense * 8} icon={<Wallet className="text-red-400" />} trend="+12%" trendUp={false} privacy={isPrivacyMode} />
                <StatCard title="Average Monthly" value={totalExpense} icon={<TrendingDown className="text-red-400" />} trend="+4%" trendUp={false} privacy={isPrivacyMode} />
                <Card className="flex flex-col justify-center">
                   <p className="text-slate-400 text-sm font-medium mb-2">Top Category</p>
                   <h3 className="text-2xl font-bold text-white">Housing</h3>
                   <div className="w-full bg-slate-700 rounded-full h-2 mt-3 overflow-hidden">
                    <div className="bg-red-500 h-full rounded-full" style={{ width: '45%' }}></div>
                  </div>
                </Card>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card title="Monthly Expenses" className="lg:col-span-2">
                    <MonthlyBarChart transactions={transactions} type={TransactionType.EXPENSE} privacy={isPrivacyMode} />
                  </Card>
                  <Card title="Category Breakdown">
                    <CategoryPieChart transactions={transactions} type={TransactionType.EXPENSE} privacy={isPrivacyMode} />
                  </Card>
               </div>

               <Card title="Recent Expenses">
                 <TransactionTable transactions={transactions.filter(t => t.type === TransactionType.EXPENSE)} privacy={isPrivacyMode} />
               </Card>
            </div>
          )}

          {activeView === View.DOCUMENTS && (
            <div className="max-w-7xl mx-auto">
               <Documents 
                  docs={documents} 
                  onAddDoc={handleAddDocument} 
                  onDeleteDoc={handleDeleteDocument} 
               />
            </div>
          )}

          {activeView === View.SETTINGS && (
             <div className="max-w-7xl mx-auto">
                <Settings />
             </div>
          )}
        </div>
      </main>

      {/* ADD TRANSACTION MODAL */}
      {isModalOpen && (
        <TransactionModal onClose={() => setIsModalOpen(false)} onSave={handleAddTransaction} />
      )}
    </div>
  );
};

// --- SUBCOMPONENTS ---

const SidebarItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${active ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
  >
    {React.cloneElement(icon as React.ReactElement<any>, { size: 20, className: active ? 'text-white' : 'group-hover:text-white transition-colors' })}
    <span className="font-medium">{label}</span>
  </button>
);

const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode; trend: string; trendUp: boolean; privacy: boolean }> = ({ title, value, icon, trend, trendUp, privacy }) => (
  <Card className="relative overflow-hidden">
    <div className="absolute right-0 top-0 p-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
        <h2 className="text-3xl font-bold text-white">
          <Money value={value} privacy={privacy} />
        </h2>
      </div>
      <div className={`p-3 rounded-xl ${trendUp ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
        {icon}
      </div>
    </div>
    <div className={`flex items-center text-sm font-medium ${trendUp ? 'text-emerald-400' : 'text-red-400'}`}>
      <span>{trend}</span>
      <span className="text-slate-500 ml-2 font-normal">vs last month</span>
    </div>
  </Card>
);

const TransactionTable: React.FC<{ transactions: Transaction[], privacy: boolean }> = ({ transactions, privacy }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="text-slate-400 text-sm border-b border-slate-800">
          <th className="py-3 font-medium pl-2">Description</th>
          <th className="py-3 font-medium">Category</th>
          <th className="py-3 font-medium">Date</th>
          <th className="py-3 font-medium text-right pr-2">Amount</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map(t => (
          <tr key={t.id} className="border-b border-slate-800/50 hover:bg-white/5 transition-colors group">
            <td className="py-4 pl-2">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type === TransactionType.INCOME ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                  {t.type === TransactionType.INCOME ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                </div>
                <span className="font-medium text-slate-200">{t.description}</span>
              </div>
            </td>
            <td className="py-4">
              <Badge>{t.category}</Badge>
            </td>
            <td className="py-4 text-slate-400 text-sm">{t.date}</td>
            <td className={`py-4 text-right font-medium pr-2 ${t.type === TransactionType.INCOME ? 'text-emerald-400' : 'text-slate-200'}`}>
              {t.type === TransactionType.INCOME ? '+' : '-'}
              <Money value={Math.abs(t.amount)} privacy={privacy} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const TransactionModal: React.FC<{ onClose: () => void; onSave: (t: any) => void }> = ({ onClose, onSave }) => {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [category, setCategory] = useState<string>(Category.MISC);
  const [loadingCat, setLoadingCat] = useState(false);

  const handleAutoCategorize = async () => {
    if (!desc) return;
    setLoadingCat(true);
    try {
      const cat = await autoCategorizeTransaction(desc);
      setCategory(cat);
    } finally {
      setLoadingCat(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      description: desc,
      amount: parseFloat(amount),
      type,
      category,
      date: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md relative animate-in fade-in zoom-in duration-200">
        <h2 className="text-xl font-bold text-white mb-6">Add Transaction</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Type</label>
            <div className="flex bg-darker p-1 rounded-lg border border-slate-700">
              <button 
                type="button"
                onClick={() => setType(TransactionType.EXPENSE)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${type === TransactionType.EXPENSE ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Expense
              </button>
              <button 
                type="button"
                onClick={() => setType(TransactionType.INCOME)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${type === TransactionType.INCOME ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Income
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Description</label>
            <div className="flex gap-2">
              <Input 
                value={desc} 
                onChange={(e) => setDesc(e.target.value)} 
                placeholder="e.g. Grocery Shopping" 
                required 
              />
              <button 
                type="button"
                onClick={handleAutoCategorize}
                disabled={!desc || loadingCat}
                className="bg-primary/20 hover:bg-primary/30 border border-primary/50 text-primary p-3 rounded-lg transition-colors disabled:opacity-50"
                title="Auto-categorize with AI"
              >
                <Wand2 className={`w-5 h-5 ${loadingCat ? 'animate-spin' : ''}`} />
              </button>
            </div>
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
            <label className="block text-sm text-slate-400 mb-1">Category</label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>

          <div className="flex gap-3 mt-6">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1">Save Transaction</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default App;
    