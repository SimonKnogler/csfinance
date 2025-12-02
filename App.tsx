
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  PieChart as PieIcon, 
  Settings as SettingsIcon, 
  Plus, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Briefcase,
  TrendingUp,
  TrendingDown,
  Banknote,
  FileText,
  Eye,
  EyeOff,
  LogOut,
  Loader2,
  Building2,
  Edit2,
  Trash2,
  X,
  User2,
  Camera
} from 'lucide-react';
import { PortfolioDocument, RecurringEntry, PortfolioOwner } from './types';
import { BudgetPieChart } from './components/Charts';
import { Card, Button, Input, Select, Badge, Money } from './components/UIComponents';
import { Portfolio } from './components/Portfolio';
import { RealEstate } from './components/RealEstate';
import { RentalTaxCalculator } from './components/RentalTaxCalculator';
import { NetWorthDashboard } from './components/NetWorthDashboard';
import { Documents } from './components/Documents';
import { Auth } from './components/Auth';
import { Settings } from './components/Settings';
import { StorageService } from './services/storageService';

// Budget categories for recurring entries
const BUDGET_CATEGORIES = [
  'Gehalt', 'Freelance', 'Dividenden', 'Mieteinnahmen', 'Sonstiges Einkommen',
  'Miete', 'Strom/Gas', 'Internet', 'Versicherungen', 'Lebensmittel', 
  'Transport', 'Abos', 'Freizeit', 'Kleidung', 'Gesundheit', 'Sonstiges'
];

enum View {
  NET_WORTH = 'net-worth',
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
  const [activeView, setActiveView] = useState<View>(View.NET_WORTH);
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  // Data State
  const [documents, setDocuments] = useState<PortfolioDocument[]>([]);
  const [recurringEntries, setRecurringEntries] = useState<RecurringEntry[]>([]);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  
  const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<RecurringEntry | null>(null);
  const profileInputRef = React.useRef<HTMLInputElement>(null);
  const [entryType, setEntryType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [incomeExpenseOwnerTab, setIncomeExpenseOwnerTab] = useState<'Total' | PortfolioOwner>('Total');

  // Initial Data Load
  useEffect(() => {
    const loadData = async () => {
      setIsDataLoading(true);
      const [docs, entries] = await Promise.all([
        StorageService.getDocuments(),
        StorageService.getRecurringEntries()
      ]);
      
      setDocuments(docs);
      setRecurringEntries(entries);
      
      // Load profile picture from localStorage (URL stored after upload)
      const savedProfilePic = localStorage.getItem('profilePictureUrl');
      if (savedProfilePic) setProfilePicUrl(savedProfilePic);
      
      setIsDataLoading(false);
    };
    loadData();
  }, []);

  // Profile picture upload handler
  const handleProfilePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Bild zu groß. Maximal 2MB erlaubt.');
      return;
    }
    
    try {
      const { CloudService } = await import('./services/cloudService');
      const url = await CloudService.uploadFile(file, `profiles/avatar_${Date.now()}`);
      
      if (url) {
        setProfilePicUrl(url);
        localStorage.setItem('profilePictureUrl', url);
      } else {
        // Fallback to local base64 if cloud upload fails
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          setProfilePicUrl(dataUrl);
          localStorage.setItem('profilePictureUrl', dataUrl);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('Profilbild Upload fehlgeschlagen:', err);
    }
  };

  // Save handlers
  const handleSaveDocuments = async (newDocs: PortfolioDocument[]) => {
    setDocuments(newDocs);
    await StorageService.saveDocuments(newDocs);
  };

  const handleSaveRecurringEntries = async (entries: RecurringEntry[]) => {
    setRecurringEntries(entries);
    await StorageService.saveRecurringEntries(entries);
  };

  // --- COMPUTED STATES ---
  const incomeEntries = useMemo(() => recurringEntries.filter(e => e.type === 'INCOME' && e.isActive), [recurringEntries]);
  const expenseEntries = useMemo(() => recurringEntries.filter(e => e.type === 'EXPENSE' && e.isActive), [recurringEntries]);
  
  const totalMonthlyIncome = useMemo(() => {
    return incomeEntries.reduce((acc, e) => {
      if (e.frequency === 'MONTHLY') return acc + e.amount;
      if (e.frequency === 'YEARLY') return acc + (e.amount / 12);
      if (e.frequency === 'WEEKLY') return acc + (e.amount * 4.33);
      return acc;
    }, 0);
  }, [incomeEntries]);
  
  const totalMonthlyExpense = useMemo(() => {
    return expenseEntries.reduce((acc, e) => {
      if (e.frequency === 'MONTHLY') return acc + e.amount;
      if (e.frequency === 'YEARLY') return acc + (e.amount / 12);
      if (e.frequency === 'WEEKLY') return acc + (e.amount * 4.33);
      return acc;
    }, 0);
  }, [expenseEntries]);

  const monthlySurplus = totalMonthlyIncome - totalMonthlyExpense;

  // --- HANDLERS ---
  const handleSaveEntry = (entry: Partial<RecurringEntry>) => {
    if (editingEntry) {
      const updated = recurringEntries.map(e => 
        e.id === editingEntry.id ? { ...e, ...entry } as RecurringEntry : e
      );
      handleSaveRecurringEntries(updated);
    } else {
      const newEntry: RecurringEntry = {
        id: Date.now().toString(),
        name: entry.name || 'Neuer Eintrag',
        amount: entry.amount || 0,
        type: entry.type || entryType,
        category: entry.category || 'Sonstiges',
        frequency: entry.frequency || 'MONTHLY',
        owner: entry.owner || PortfolioOwner.ME,
        isActive: entry.isActive !== undefined ? entry.isActive : true,
        notes: entry.notes || '',
      };
      handleSaveRecurringEntries([...recurringEntries, newEntry]);
    }
    setIsAddEntryModalOpen(false);
    setEditingEntry(null);
  };

  const handleDeleteEntry = async (id: string) => {
    if (window.confirm('Diesen Eintrag wirklich löschen?')) {
      // Delete from cloud and local storage
      await StorageService.deleteRecurringEntry(id);
      // Update local state
      setRecurringEntries(recurringEntries.filter(e => e.id !== id));
    }
  };

  const handleAddDocument = (doc: PortfolioDocument) => {
    const updated = [doc, ...documents];
    handleSaveDocuments(updated);
  };

  const handleDeleteDocument = async (id: string, storagePath?: string) => {
    if (window.confirm('Dieses Dokument endgültig löschen?')) {
      // Delete from Firebase Storage if cloud stored
      if (storagePath) {
        const { CloudService } = await import('./services/cloudService');
        await CloudService.deleteFile(storagePath);
      }
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
            icon={<Wallet />} 
            label="Nettovermögen" 
            active={activeView === View.NET_WORTH} 
            onClick={() => setActiveView(View.NET_WORTH)} 
          />
           <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
             Vermögen
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
            label="Einnahmen" 
            active={activeView === View.INCOME} 
            onClick={() => setActiveView(View.INCOME)} 
          />
          <SidebarItem 
            icon={<TrendingDown />} 
            label="Ausgaben" 
            active={activeView === View.EXPENSES} 
            onClick={() => setActiveView(View.EXPENSES)} 
          />
          <SidebarItem 
            icon={<FileText />} 
            label="Dokumente" 
            active={activeView === View.DOCUMENTS} 
            onClick={() => setActiveView(View.DOCUMENTS)} 
          />
          <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
             System
          </div>
          <SidebarItem 
            icon={<SettingsIcon />} 
            label="Einstellungen" 
            active={activeView === View.SETTINGS} 
            onClick={() => setActiveView(View.SETTINGS)} 
          />
        </nav>

        <div className="space-y-4">
          <button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm px-2">
            <LogOut size={16} /> Abmelden
          </button>

          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 mt-auto">
            <p className="text-xs text-slate-400 mb-1">Monatlicher Überschuss</p>
            <div className="flex justify-between items-end mb-2">
              <span className={`text-lg font-bold ${monthlySurplus >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPrivacyMode ? '****' : `€${Math.round(monthlySurplus).toLocaleString()}`}
              </span>
              <span className="text-xs text-slate-400">/Monat</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-full rounded-full ${monthlySurplus >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} 
                style={{ width: `${Math.min(100, Math.abs(monthlySurplus / Math.max(totalMonthlyIncome, 1)) * 100)}%` }}
              ></div>
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

            {(activeView === View.INCOME || activeView === View.EXPENSES) && (
              <Button onClick={() => {
                setEntryType(activeView === View.INCOME ? 'INCOME' : 'EXPENSE');
                setIsAddEntryModalOpen(true);
              }}>
                <Plus className="w-4 h-4" />
                Eintrag hinzufügen
              </Button>
            )}
            {/* Profile Picture */}
            <input 
              ref={profileInputRef}
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleProfilePicUpload}
            />
            <button 
              onClick={() => profileInputRef.current?.click()}
              className="relative w-10 h-10 rounded-full bg-slate-700 border border-slate-600 overflow-hidden group"
              title="Profilbild ändern"
            >
              {profilePicUrl ? (
                <img src={profilePicUrl} alt="Profil" className="w-full h-full object-cover" />
              ) : (
                <User2 className="w-full h-full p-2 text-slate-400" />
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={16} className="text-white" />
              </div>
            </button>
          </div>
        </header>

        {/* SCROLLABLE AREA */}
        <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
          {activeView === View.NET_WORTH && (
            <div className="max-w-7xl mx-auto">
              <NetWorthDashboard 
                privacy={isPrivacyMode} 
                onNavigate={(view) => setActiveView(view as View)}
              />
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
               {/* Owner Tabs */}
               <div className="flex bg-darker p-1 rounded-lg border border-slate-800 w-full md:w-fit">
                 <button onClick={() => setIncomeExpenseOwnerTab('Total')} className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-colors ${incomeExpenseOwnerTab === 'Total' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Gesamt</button>
                 <button onClick={() => setIncomeExpenseOwnerTab(PortfolioOwner.ME)} className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-colors ${incomeExpenseOwnerTab === PortfolioOwner.ME ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Ich</button>
                 <button onClick={() => setIncomeExpenseOwnerTab(PortfolioOwner.CAROLINA)} className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-colors ${incomeExpenseOwnerTab === PortfolioOwner.CAROLINA ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Carolina</button>
               </div>

               {/* Summary Cards */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Monatliches Einkommen" value={totalMonthlyIncome} icon={<Banknote className="text-emerald-400" />} trend={`${incomeEntries.length} Einträge`} trendUp={true} privacy={isPrivacyMode} />
                <StatCard title="Jährliches Einkommen" value={totalMonthlyIncome * 12} icon={<TrendingUp className="text-emerald-400" />} trend="Hochrechnung" trendUp={true} privacy={isPrivacyMode} />
                <Card className="flex flex-col justify-center">
                  <p className="text-slate-400 text-sm font-medium mb-2">Monatlicher Überschuss</p>
                  <h3 className={`text-2xl font-bold ${monthlySurplus >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    <Money value={monthlySurplus} privacy={isPrivacyMode} sign />
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Einkommen - Ausgaben</p>
                </Card>
               </div>

               {/* Income Pie Chart */}
               <Card title="Einnahmen nach Kategorie">
                 <BudgetPieChart 
                   entries={incomeExpenseOwnerTab === 'Total' 
                     ? recurringEntries 
                     : recurringEntries.filter(e => e.owner === incomeExpenseOwnerTab)} 
                   type="INCOME" 
                   privacy={isPrivacyMode} 
                 />
               </Card>

               {/* Recurring Income Entries */}
               <Card>
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="text-lg font-semibold text-white">Wiederkehrende Einnahmen</h3>
                   <Button onClick={() => { setEntryType('INCOME'); setIsAddEntryModalOpen(true); }}>
                     <Plus size={16} /> Hinzufügen
                   </Button>
                 </div>
                 {(() => {
                   const filteredIncome = recurringEntries.filter(e => 
                     e.type === 'INCOME' && 
                     (incomeExpenseOwnerTab === 'Total' || e.owner === incomeExpenseOwnerTab)
                   );
                   return filteredIncome.length === 0 ? (
                     <p className="text-slate-400 text-center py-8">Keine Einträge vorhanden. Füge deine erste Einnahmequelle hinzu.</p>
                   ) : (
                     <div className="space-y-2">
                       {filteredIncome.map(entry => (
                         <div key={entry.id} className={`flex items-center justify-between p-4 rounded-lg ${entry.isActive ? 'bg-slate-800' : 'bg-slate-800/50 opacity-60'}`}>
                           <div className="flex items-center gap-4">
                             <div className={`w-2 h-2 rounded-full ${entry.isActive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                             <div>
                               <p className="text-white font-medium">{entry.name}</p>
                               <p className="text-xs text-slate-500">
                                 {entry.category} • {entry.frequency === 'MONTHLY' ? 'Monatlich' : entry.frequency === 'YEARLY' ? 'Jährlich' : 'Wöchentlich'}
                                 {incomeExpenseOwnerTab === 'Total' && entry.owner && (
                                   <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${entry.owner === PortfolioOwner.ME ? 'bg-indigo-500/20 text-indigo-300' : 'bg-pink-500/20 text-pink-300'}`}>
                                     {entry.owner === PortfolioOwner.ME ? 'Ich' : 'Carolina'}
                                   </span>
                                 )}
                               </p>
                             </div>
                           </div>
                           <div className="flex items-center gap-4">
                             <p className="text-emerald-400 font-bold">
                               <Money value={entry.amount} privacy={isPrivacyMode} />
                             </p>
                             <div className="flex gap-1">
                               <button onClick={() => { setEditingEntry(entry); setEntryType('INCOME'); setIsAddEntryModalOpen(true); }} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white">
                                 <Edit2 size={16} />
                               </button>
                               <button onClick={() => handleDeleteEntry(entry.id)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-red-400">
                                 <Trash2 size={16} />
                               </button>
                             </div>
                           </div>
                         </div>
                       ))}
                     </div>
                   );
                 })()}
               </Card>

               {/* Rental Income Tax Calculator */}
               <RentalTaxCalculator privacy={isPrivacyMode} />
            </div>
          )}

          {activeView === View.EXPENSES && (
            <div className="max-w-7xl mx-auto space-y-8">
               {/* Owner Tabs */}
               <div className="flex bg-darker p-1 rounded-lg border border-slate-800 w-full md:w-fit">
                 <button onClick={() => setIncomeExpenseOwnerTab('Total')} className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-colors ${incomeExpenseOwnerTab === 'Total' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Gesamt</button>
                 <button onClick={() => setIncomeExpenseOwnerTab(PortfolioOwner.ME)} className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-colors ${incomeExpenseOwnerTab === PortfolioOwner.ME ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Ich</button>
                 <button onClick={() => setIncomeExpenseOwnerTab(PortfolioOwner.CAROLINA)} className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-colors ${incomeExpenseOwnerTab === PortfolioOwner.CAROLINA ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Carolina</button>
               </div>

               {/* Summary Cards */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Monatliche Ausgaben" value={totalMonthlyExpense} icon={<Wallet className="text-red-400" />} trend={`${expenseEntries.length} Einträge`} trendUp={false} privacy={isPrivacyMode} />
                <StatCard title="Jährliche Ausgaben" value={totalMonthlyExpense * 12} icon={<TrendingDown className="text-red-400" />} trend="Hochrechnung" trendUp={false} privacy={isPrivacyMode} />
                <Card className="flex flex-col justify-center">
                  <p className="text-slate-400 text-sm font-medium mb-2">Sparquote</p>
                  <h3 className={`text-2xl font-bold ${monthlySurplus >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {totalMonthlyIncome > 0 ? ((monthlySurplus / totalMonthlyIncome) * 100).toFixed(1) : 0}%
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">vom Einkommen</p>
                </Card>
               </div>

               {/* Expense Pie Chart */}
               <Card title="Ausgaben nach Kategorie">
                 <BudgetPieChart 
                   entries={incomeExpenseOwnerTab === 'Total' 
                     ? recurringEntries 
                     : recurringEntries.filter(e => e.owner === incomeExpenseOwnerTab)} 
                   type="EXPENSE" 
                   privacy={isPrivacyMode} 
                 />
               </Card>

               {/* Recurring Expense Entries */}
               <Card>
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="text-lg font-semibold text-white">Wiederkehrende Ausgaben</h3>
                   <Button onClick={() => { setEntryType('EXPENSE'); setIsAddEntryModalOpen(true); }}>
                     <Plus size={16} /> Hinzufügen
                   </Button>
                 </div>
                 {(() => {
                   const filteredExpense = recurringEntries.filter(e => 
                     e.type === 'EXPENSE' && 
                     (incomeExpenseOwnerTab === 'Total' || e.owner === incomeExpenseOwnerTab)
                   );
                   return filteredExpense.length === 0 ? (
                     <p className="text-slate-400 text-center py-8">Keine Einträge vorhanden. Füge deine erste Ausgabe hinzu.</p>
                   ) : (
                     <div className="space-y-2">
                       {filteredExpense.map(entry => (
                         <div key={entry.id} className={`flex items-center justify-between p-4 rounded-lg ${entry.isActive ? 'bg-slate-800' : 'bg-slate-800/50 opacity-60'}`}>
                           <div className="flex items-center gap-4">
                             <div className={`w-2 h-2 rounded-full ${entry.isActive ? 'bg-red-400' : 'bg-slate-500'}`} />
                             <div>
                               <p className="text-white font-medium">{entry.name}</p>
                               <p className="text-xs text-slate-500">
                                 {entry.category} • {entry.frequency === 'MONTHLY' ? 'Monatlich' : entry.frequency === 'YEARLY' ? 'Jährlich' : 'Wöchentlich'}
                                 {incomeExpenseOwnerTab === 'Total' && entry.owner && (
                                   <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${entry.owner === PortfolioOwner.ME ? 'bg-indigo-500/20 text-indigo-300' : 'bg-pink-500/20 text-pink-300'}`}>
                                     {entry.owner === PortfolioOwner.ME ? 'Ich' : 'Carolina'}
                                   </span>
                                 )}
                               </p>
                             </div>
                           </div>
                           <div className="flex items-center gap-4">
                             <p className="text-red-400 font-bold">
                               <Money value={entry.amount} privacy={isPrivacyMode} />
                             </p>
                             <div className="flex gap-1">
                               <button onClick={() => { setEditingEntry(entry); setEntryType('EXPENSE'); setIsAddEntryModalOpen(true); }} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white">
                                 <Edit2 size={16} />
                               </button>
                               <button onClick={() => handleDeleteEntry(entry.id)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-red-400">
                                 <Trash2 size={16} />
                               </button>
                             </div>
                           </div>
                         </div>
                       ))}
                     </div>
                   );
                 })()}
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

      {/* ADD/EDIT RECURRING ENTRY MODAL */}
      {isAddEntryModalOpen && (
        <RecurringEntryModal 
          onClose={() => { setIsAddEntryModalOpen(false); setEditingEntry(null); }} 
          onSave={handleSaveEntry}
          initialData={editingEntry || undefined}
          type={entryType}
        />
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

// Recurring Entry Modal
const RecurringEntryModal: React.FC<{ 
  onClose: () => void; 
  onSave: (entry: Partial<RecurringEntry>) => void;
  initialData?: RecurringEntry;
  type: 'INCOME' | 'EXPENSE';
}> = ({ onClose, onSave, initialData, type }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [category, setCategory] = useState(initialData?.category || 'Sonstiges');
  const [frequency, setFrequency] = useState<'MONTHLY' | 'YEARLY' | 'WEEKLY'>(initialData?.frequency || 'MONTHLY');
  const [owner, setOwner] = useState<PortfolioOwner>(initialData?.owner || PortfolioOwner.ME);
  const [isActive, setIsActive] = useState(initialData?.isActive !== undefined ? initialData.isActive : true);
  const [notes, setNotes] = useState(initialData?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initialData?.id,
      name,
      amount: parseFloat(amount),
      type: initialData?.type || type,
      category,
      frequency,
      owner,
      isActive,
      notes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md relative animate-in fade-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold text-white mb-6">
          {initialData ? 'Eintrag bearbeiten' : `${type === 'INCOME' ? 'Einnahme' : 'Ausgabe'} hinzufügen`}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Name</label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder={type === 'INCOME' ? 'z.B. Gehalt, Mieteinnahmen' : 'z.B. Miete, Netflix'} 
              required 
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Betrag (€)</label>
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
            <label className="block text-sm text-slate-400 mb-1">Kategorie</label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {BUDGET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Häufigkeit</label>
            <div className="flex bg-darker p-1 rounded-lg border border-slate-700">
              {(['WEEKLY', 'MONTHLY', 'YEARLY'] as const).map(f => (
                <button 
                  key={f}
                  type="button"
                  onClick={() => setFrequency(f)}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${frequency === f ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  {f === 'WEEKLY' ? 'Wöchentlich' : f === 'MONTHLY' ? 'Monatlich' : 'Jährlich'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Besitzer</label>
            <div className="flex bg-darker p-1 rounded-lg border border-slate-700">
              <button 
                type="button"
                onClick={() => setOwner(PortfolioOwner.ME)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${owner === PortfolioOwner.ME ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Ich
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

          <div>
            <label className="block text-sm text-slate-400 mb-1">Notizen (optional)</label>
            <Input 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              placeholder="Zusätzliche Infos..." 
            />
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="isActive" 
              checked={isActive} 
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-primary"
            />
            <label htmlFor="isActive" className="text-sm text-slate-300">Aktiv (wird in Berechnung einbezogen)</label>
          </div>

          <div className="flex gap-3 mt-6">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Abbrechen</Button>
            <Button type="submit" className="flex-1">Speichern</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default App;
    