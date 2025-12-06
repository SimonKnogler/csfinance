
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home, 
  Plus, 
  Edit2, 
  Trash2, 
  X,
  TrendingUp,
  Building2,
  ChevronUp,
  ChevronDown,
  Wallet,
  PiggyBank,
  Calculator,
  SlidersHorizontal,
  LayoutGrid,
  HardHat,
  Save,
  Copy,
  ShoppingCart,
  AlertTriangle,
  Receipt,
  TrendingDown,
  BarChart3,
  Shield,
  Percent,
  FileText,
  Loader2,
  CheckCircle,
  Clock,
  CheckCircle2,
  Users
} from 'lucide-react';

enum SubView {
  OVERVIEW = 'Übersicht',
  BUSINESSPLAN = 'Businessplan',
  PROJEKTPLAN = 'Projektplan',
  STEUER_EUR = 'Steuer EÜR',
  SIMULATOR = 'Simulator',
  DOKUMENT = 'Dokument',
}
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
  PieChart,
  Pie,
  ComposedChart,
  Line,
  Cell
} from 'recharts';
import { RealEstateProperty, PortfolioOwner, BusinessPlanData } from '../types';
import { StorageService } from '../services/storageService';
import { Card, Button, Input, Select, Badge, Money } from './UIComponents';

interface RealEstateProps {
  privacy: boolean;
}

export const RealEstate: React.FC<RealEstateProps> = ({ privacy }) => {
  const [subView, setSubView] = useState<SubView>(SubView.OVERVIEW);
  const [properties, setProperties] = useState<RealEstateProperty[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<RealEstateProperty | null>(null);
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);

  // Load properties
  useEffect(() => {
    const load = async () => {
      const data = await StorageService.getRealEstate();
      setProperties(data);
    };
    load();
  }, []);

  // Save properties
  const updateProperties = async (newProperties: RealEstateProperty[]) => {
    setProperties(newProperties);
    await StorageService.saveRealEstate(newProperties);
  };

  const handleSaveProperty = async (property: Partial<RealEstateProperty>) => {
    if (property.id) {
      // Update existing
      const updated = properties.map(p => 
        p.id === property.id ? { ...p, ...property } as RealEstateProperty : p
      );
      await updateProperties(updated);
    } else {
      // Add new
      const newProperty: RealEstateProperty = {
        id: Date.now().toString(),
        name: property.name || 'Neue Immobilie',
        address: property.address || '',
        owner: property.owner || PortfolioOwner.ME,
        purchasePrice: property.purchasePrice || 0,
        purchaseDate: property.purchaseDate || new Date().toISOString().split('T')[0],
        currentValue: property.currentValue || property.purchasePrice || 0,
        loanAmount: property.loanAmount || 0,
        interestRate: property.interestRate || 3.5,
        loanTermYears: property.loanTermYears || 30,
        monthlyPayment: property.monthlyPayment || 0,
        monthlyPrincipal: property.monthlyPrincipal || 0,
        monthlyInterest: property.monthlyInterest || 0,
        monthlyRent: property.monthlyRent || 0,
        isRented: property.isRented || false,
        monthlyTaxes: property.monthlyTaxes || 0,
        monthlyInsurance: property.monthlyInsurance || 0,
        monthlyMaintenance: property.monthlyMaintenance || 0,
        monthlyHOA: property.monthlyHOA || 0,
        specialRepayment: property.specialRepayment || 0,
        savingsTarget: property.savingsTarget || 0,
        currentSavings: property.currentSavings || 0,
        notes: property.notes || '',
      };
      await updateProperties([...properties, newProperty]);
    }
    setIsAddModalOpen(false);
    setEditingProperty(null);
  };

  const handleDeleteProperty = async (id: string) => {
    if (confirm('Diese Immobilie wirklich löschen?')) {
      await updateProperties(properties.filter(p => p.id !== id));
    }
  };

  // Calculate totals
  const totals = useMemo(() => {
    let totalValue = 0;
    let totalDebt = 0;
    let totalEquity = 0;
    let monthlyIncome = 0;
    let monthlyExpenses = 0;
    let monthlyCashflow = 0;

    properties.forEach(p => {
      totalValue += p.currentValue;
      totalDebt += p.loanAmount;
      
      if (p.isRented) {
        monthlyIncome += p.monthlyRent;
      }
      
      const expenses = p.monthlyPayment + p.monthlyTaxes + p.monthlyInsurance + 
                       p.monthlyMaintenance + p.monthlyHOA;
      monthlyExpenses += expenses;
    });

    totalEquity = totalValue - totalDebt;
    monthlyCashflow = monthlyIncome - monthlyExpenses;

    return { totalValue, totalDebt, totalEquity, monthlyIncome, monthlyExpenses, monthlyCashflow };
  }, [properties]);

  // Amortization projection
  const projectionData = useMemo(() => {
    if (properties.length === 0) return [];
    
    const data = [];
    let totalDebt = totals.totalDebt;
    let totalEquity = totals.totalEquity;
    const yearlyPrincipal = properties.reduce((sum, p) => sum + (p.monthlyPrincipal * 12) + p.specialRepayment, 0);
    const appreciation = 0.02; // 2% yearly appreciation

    for (let year = 0; year <= 15; year++) {
      data.push({
        year: new Date().getFullYear() + year,
        debt: Math.round(Math.max(0, totalDebt)),
        equity: Math.round(totalEquity),
        value: Math.round(totalDebt + totalEquity)
      });
      
      totalDebt = Math.max(0, totalDebt - yearlyPrincipal);
      totalEquity = (totals.totalValue * Math.pow(1 + appreciation, year + 1)) - totalDebt;
    }
    
    return data;
  }, [properties, totals]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Building2 size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Immobilien</h2>
            <p className="text-slate-400 text-sm">{properties.length} {properties.length === 1 ? 'Immobilie' : 'Immobilien'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* SubView Toggle */}
          <div className="flex flex-wrap bg-darker p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setSubView(SubView.OVERVIEW)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                subView === SubView.OVERVIEW ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid size={16} /> Übersicht
            </button>
            <button
              onClick={() => setSubView(SubView.BUSINESSPLAN)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                subView === SubView.BUSINESSPLAN ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText size={16} /> Businessplan
            </button>
            <button
              onClick={() => setSubView(SubView.PROJEKTPLAN)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                subView === SubView.PROJEKTPLAN ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 size={16} /> 5-Wohnungen
            </button>
            <button
              onClick={() => setSubView(SubView.STEUER_EUR)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                subView === SubView.STEUER_EUR ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Receipt size={16} /> Steuer EÜR
            </button>
            <button
              onClick={() => setSubView(SubView.SIMULATOR)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                subView === SubView.SIMULATOR ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal size={16} /> Simulator
            </button>
            <button
              onClick={() => setSubView(SubView.DOKUMENT)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                subView === SubView.DOKUMENT ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText size={16} /> PDF Export
            </button>
          </div>
          {subView === SubView.OVERVIEW && (
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus size={18} /> Immobilie hinzufügen
            </Button>
          )}
        </div>
      </div>

      {/* OVERVIEW VIEW */}
      {subView === SubView.OVERVIEW && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="text-center">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Gesamtwert</p>
              <p className="text-xl font-bold text-white"><Money value={totals.totalValue} privacy={privacy} fractionDigits={0} /></p>
            </Card>
            <Card className="text-center">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Schulden</p>
              <p className="text-xl font-bold text-red-400"><Money value={totals.totalDebt} privacy={privacy} fractionDigits={0} /></p>
            </Card>
            <Card className="text-center">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Eigenkapital</p>
              <p className="text-xl font-bold text-emerald-400"><Money value={totals.totalEquity} privacy={privacy} fractionDigits={0} /></p>
            </Card>
            <Card className="text-center">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Mieteinnahmen</p>
              <p className="text-xl font-bold text-white"><Money value={totals.monthlyIncome} privacy={privacy} fractionDigits={0} />/Mo</p>
            </Card>
            <Card className="text-center">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Ausgaben</p>
              <p className="text-xl font-bold text-orange-400"><Money value={totals.monthlyExpenses} privacy={privacy} fractionDigits={0} />/Mo</p>
            </Card>
            <Card className="text-center">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Cashflow</p>
              <p className={`text-xl font-bold ${totals.monthlyCashflow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                <Money value={totals.monthlyCashflow} privacy={privacy} fractionDigits={0} sign />/Mo
              </p>
            </Card>
          </div>

          {/* Properties List */}
          {properties.length === 0 ? (
            <Card className="text-center py-12">
              <Home size={48} className="mx-auto text-slate-600 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Keine Immobilien</h3>
              <p className="text-slate-400 mb-4">Füge deine erste Immobilie hinzu, um zu starten.</p>
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus size={18} /> Immobilie hinzufügen
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {properties.map(property => (
                <PropertyCard 
                  key={property.id}
                  property={property}
                  privacy={privacy}
                  isExpanded={expandedProperty === property.id}
                  onToggle={() => setExpandedProperty(expandedProperty === property.id ? null : property.id)}
                  onEdit={() => setEditingProperty(property)}
                  onDelete={() => handleDeleteProperty(property.id)}
                />
              ))}
            </div>
          )}

          {/* Projection Chart */}
          {properties.length > 0 && (
            <Card>
              <h3 className="text-lg font-bold text-white mb-4">Vermögensentwicklung (15 Jahre)</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projectionData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorDebt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => privacy ? '' : `€${val/1000}k`} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} 
                      formatter={(val: number) => [privacy ? '****' : `€${val.toLocaleString()}`]}
                      labelFormatter={(label) => `Jahr ${label}`}
                    />
                    <Legend />
                    <Area type="monotone" name="Eigenkapital" dataKey="equity" stroke="#10b981" fill="url(#colorEquity)" strokeWidth={2} />
                    <Area type="monotone" name="Schulden" dataKey="debt" stroke="#ef4444" fill="url(#colorDebt)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </>
      )}

      {/* SIMULATOR VIEW */}
      {subView === SubView.SIMULATOR && (
        <PropertySimulator properties={properties} privacy={privacy} />
      )}

      {/* KAUFANALYSE VIEW */}
      {/* BUSINESSPLAN VIEW */}
      {subView === SubView.BUSINESSPLAN && (
        <BusinessPlanCalculator privacy={privacy} />
      )}

      {/* PROJEKTPLAN VIEW */}
      {subView === SubView.PROJEKTPLAN && (
        <ProjektplanSimulator privacy={privacy} />
      )}

      {/* STEUER EÜR VIEW */}
      {subView === SubView.STEUER_EUR && (
        <TaxEURCalculator properties={properties} privacy={privacy} />
      )}

      {/* DOKUMENT VIEW */}
      {subView === SubView.DOKUMENT && (
        <BusinessPlanDocument privacy={privacy} />
      )}

      {/* PROJEKTPLAN VIEW */}
      {subView === SubView.PROJEKTPLAN && (
        <ProjektplanSimulator privacy={privacy} />
      )}

      {/* Add/Edit Modal */}
      {(isAddModalOpen || editingProperty) && (
        <PropertyModal
          onClose={() => { setIsAddModalOpen(false); setEditingProperty(null); }}
          onSave={handleSaveProperty}
          initialData={editingProperty || undefined}
        />
      )}
    </div>
  );
};

// --- Property Card Component ---
const PropertyCard: React.FC<{
  property: RealEstateProperty;
  privacy: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ property, privacy, isExpanded, onToggle, onEdit, onDelete }) => {
  const equity = property.currentValue - property.loanAmount;
  const ltv = property.currentValue > 0 ? (property.loanAmount / property.currentValue) * 100 : 0;
  const monthlyExpenses = property.monthlyPayment + property.monthlyTaxes + 
                          property.monthlyInsurance + property.monthlyMaintenance + property.monthlyHOA;
  const monthlyCashflow = property.isRented ? property.monthlyRent - monthlyExpenses : -monthlyExpenses;
  const roi = property.isRented && equity > 0 ? ((monthlyCashflow * 12) / equity) * 100 : 0;

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
            <Home size={24} className="text-amber-400" />
          </div>
          <div>
            <h3 className="font-bold text-white flex items-center gap-2">
              {property.name}
              {property.isRented && (
                <Badge color="bg-emerald-500/20 text-emerald-300">Vermietet</Badge>
              )}
            </h3>
            <p className="text-slate-400 text-sm">{property.address}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right hidden md:block">
            <p className="text-slate-400 text-xs">Wert</p>
            <p className="font-bold text-white"><Money value={property.currentValue} privacy={privacy} fractionDigits={0} /></p>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-slate-400 text-xs">Eigenkapital</p>
            <p className="font-bold text-emerald-400"><Money value={equity} privacy={privacy} fractionDigits={0} /></p>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-slate-400 text-xs">Cashflow</p>
            <p className={`font-bold ${monthlyCashflow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              <Money value={monthlyCashflow} privacy={privacy} fractionDigits={0} sign />/Mo
            </p>
          </div>
          {isExpanded ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-6 pt-6 border-t border-slate-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            {/* Mortgage Info */}
            <div>
              <h4 className="text-slate-400 text-xs uppercase tracking-wide mb-3 flex items-center gap-2">
                <Wallet size={14} /> Finanzierung
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Darlehen:</span>
                  <span className="text-white"><Money value={property.loanAmount} privacy={privacy} fractionDigits={0} /></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Zinssatz:</span>
                  <span className="text-white">{property.interestRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">LTV:</span>
                  <span className={`${ltv > 80 ? 'text-red-400' : ltv > 60 ? 'text-yellow-400' : 'text-emerald-400'}`}>{ltv.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Monthly Payment */}
            <div>
              <h4 className="text-slate-400 text-xs uppercase tracking-wide mb-3 flex items-center gap-2">
                <Calculator size={14} /> Rate / Monat
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Tilgung:</span>
                  <span className="text-white"><Money value={property.monthlyPrincipal} privacy={privacy} /></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Zinsen:</span>
                  <span className="text-white"><Money value={property.monthlyInterest} privacy={privacy} /></span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-slate-300">Gesamt:</span>
                  <span className="text-white"><Money value={property.monthlyPayment} privacy={privacy} /></span>
                </div>
              </div>
            </div>

            {/* Expenses */}
            <div>
              <h4 className="text-slate-400 text-xs uppercase tracking-wide mb-3 flex items-center gap-2">
                <TrendingUp size={14} /> Nebenkosten
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Steuern:</span>
                  <span className="text-white"><Money value={property.monthlyTaxes} privacy={privacy} /></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Versicherung:</span>
                  <span className="text-white"><Money value={property.monthlyInsurance} privacy={privacy} /></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Rücklagen:</span>
                  <span className="text-white"><Money value={property.monthlyMaintenance} privacy={privacy} /></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Hausgeld:</span>
                  <span className="text-white"><Money value={property.monthlyHOA} privacy={privacy} /></span>
                </div>
              </div>
            </div>

            {/* Savings & Extra */}
            <div>
              <h4 className="text-slate-400 text-xs uppercase tracking-wide mb-3 flex items-center gap-2">
                <PiggyBank size={14} /> Rücklagen & Extra
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Sondertilgung/Jahr:</span>
                  <span className="text-white"><Money value={property.specialRepayment} privacy={privacy} fractionDigits={0} /></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Rücklagen Ziel:</span>
                  <span className="text-white"><Money value={property.savingsTarget} privacy={privacy} fractionDigits={0} /></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Aktuelle Rücklagen:</span>
                  <span className="text-emerald-400"><Money value={property.currentSavings} privacy={privacy} fractionDigits={0} /></span>
                </div>
                {property.isRented && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">ROI:</span>
                    <span className={`${roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{roi.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={onEdit}>
              <Edit2 size={16} /> Bearbeiten
            </Button>
            <Button variant="danger" onClick={onDelete}>
              <Trash2 size={16} /> Löschen
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

// --- Property Modal ---
const PropertyModal: React.FC<{
  onClose: () => void;
  onSave: (property: Partial<RealEstateProperty>) => Promise<void>;
  initialData?: RealEstateProperty;
}> = ({ onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<Partial<RealEstateProperty>>({
    name: initialData?.name || '',
    address: initialData?.address || '',
    owner: initialData?.owner || PortfolioOwner.ME,
    purchasePrice: initialData?.purchasePrice || 0,
    purchaseDate: initialData?.purchaseDate || new Date().toISOString().split('T')[0],
    currentValue: initialData?.currentValue || 0,
    loanAmount: initialData?.loanAmount || 0,
    interestRate: initialData?.interestRate || 3.5,
    loanTermYears: initialData?.loanTermYears || 30,
    monthlyPayment: initialData?.monthlyPayment || 0,
    monthlyPrincipal: initialData?.monthlyPrincipal || 0,
    monthlyInterest: initialData?.monthlyInterest || 0,
    monthlyRent: initialData?.monthlyRent || 0,
    isRented: initialData?.isRented || false,
    monthlyTaxes: initialData?.monthlyTaxes || 0,
    monthlyInsurance: initialData?.monthlyInsurance || 0,
    monthlyMaintenance: initialData?.monthlyMaintenance || 0,
    monthlyHOA: initialData?.monthlyHOA || 0,
    specialRepayment: initialData?.specialRepayment || 0,
    savingsTarget: initialData?.savingsTarget || 0,
    currentSavings: initialData?.currentSavings || 0,
    notes: initialData?.notes || '',
  });

  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'basic' | 'mortgage' | 'expenses' | 'savings'>('basic');

  const updateField = <K extends keyof RealEstateProperty>(key: K, value: RealEstateProperty[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // Auto-calculate monthly payment from loan details
  useEffect(() => {
    if (formData.loanAmount && formData.interestRate && formData.loanTermYears) {
      const principal = formData.loanAmount;
      const monthlyRate = formData.interestRate / 100 / 12;
      const numPayments = formData.loanTermYears * 12;
      
      if (monthlyRate > 0) {
        const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                              (Math.pow(1 + monthlyRate, numPayments) - 1);
        const monthlyInterest = principal * monthlyRate;
        const monthlyPrincipal = monthlyPayment - monthlyInterest;
        
        setFormData(prev => ({
          ...prev,
          monthlyPayment: Math.round(monthlyPayment * 100) / 100,
          monthlyInterest: Math.round(monthlyInterest * 100) / 100,
          monthlyPrincipal: Math.round(monthlyPrincipal * 100) / 100,
        }));
      }
    }
  }, [formData.loanAmount, formData.interestRate, formData.loanTermYears]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSave({
      ...formData,
      id: initialData?.id,
    });
    setLoading(false);
  };

  const sections = [
    { id: 'basic', label: 'Grunddaten' },
    { id: 'mortgage', label: 'Finanzierung' },
    { id: 'expenses', label: 'Kosten' },
    { id: 'savings', label: 'Rücklagen' },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl relative animate-in fade-in zoom-in duration-200 my-8">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-500 hover:text-white">
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold text-white mb-6">
          {initialData ? 'Immobilie bearbeiten' : 'Neue Immobilie'}
        </h2>

        {/* Section Tabs */}
        <div className="flex bg-darker p-1 rounded-lg border border-slate-700 mb-6">
          {sections.map(section => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                activeSection === section.id ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          {activeSection === 'basic' && (
            <>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Name / Bezeichnung</label>
                <Input
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="z.B. Wohnung Berlin"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Adresse</label>
                <Input
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="Straße, PLZ Ort"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Kaufpreis</label>
                  <Input
                    type="number"
                    value={formData.purchasePrice || ''}
                    onChange={(e) => updateField('purchasePrice', Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Aktueller Wert</label>
                  <Input
                    type="number"
                    value={formData.currentValue || ''}
                    onChange={(e) => updateField('currentValue', Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Kaufdatum</label>
                  <Input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => updateField('purchaseDate', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Eigentümer</label>
                  <div className="flex bg-darker p-1 rounded-lg border border-slate-700">
                    <button
                      type="button"
                      onClick={() => updateField('owner', PortfolioOwner.ME)}
                      className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                        formData.owner === PortfolioOwner.ME ? 'bg-indigo-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Me
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('owner', PortfolioOwner.CAROLINA)}
                      className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                        formData.owner === PortfolioOwner.CAROLINA ? 'bg-pink-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Carolina
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('owner', PortfolioOwner.JOINT)}
                      className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                        formData.owner === PortfolioOwner.JOINT ? 'bg-purple-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Gemeinsam
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isRented"
                  checked={formData.isRented}
                  onChange={(e) => updateField('isRented', e.target.checked)}
                  className="w-5 h-5 rounded border-slate-600 bg-darker text-primary focus:ring-primary"
                />
                <label htmlFor="isRented" className="text-slate-300">Diese Immobilie wird vermietet</label>
              </div>
              {formData.isRented && (
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Monatliche Mieteinnahmen</label>
                  <Input
                    type="number"
                    value={formData.monthlyRent || ''}
                    onChange={(e) => updateField('monthlyRent', Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
              )}
            </>
          )}

          {/* Mortgage */}
          {activeSection === 'mortgage' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Darlehenssumme</label>
                  <Input
                    type="number"
                    value={formData.loanAmount || ''}
                    onChange={(e) => updateField('loanAmount', Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Zinssatz (% p.a.)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.interestRate || ''}
                    onChange={(e) => updateField('interestRate', Number(e.target.value))}
                    placeholder="3.5"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Laufzeit (Jahre)</label>
                <Input
                  type="number"
                  value={formData.loanTermYears || ''}
                  onChange={(e) => updateField('loanTermYears', Number(e.target.value))}
                  placeholder="30"
                />
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
                <h4 className="text-sm font-medium text-slate-300 mb-2">Berechnete monatliche Rate</h4>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Tilgung:</span>
                  <span className="text-white">€{(formData.monthlyPrincipal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Zinsen:</span>
                  <span className="text-white">€{(formData.monthlyInterest || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-slate-700 pt-2 mt-2">
                  <span className="text-slate-300">Gesamtrate:</span>
                  <span className="text-white">€{(formData.monthlyPayment || 0).toFixed(2)}</span>
                </div>
              </div>
              <div className="text-xs text-slate-500">
                Hinweis: Du kannst die Werte auch manuell überschreiben, falls sie von der Berechnung abweichen.
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Tilgung/Monat</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.monthlyPrincipal || ''}
                    onChange={(e) => updateField('monthlyPrincipal', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Zinsen/Monat</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.monthlyInterest || ''}
                    onChange={(e) => updateField('monthlyInterest', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Rate Gesamt</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.monthlyPayment || ''}
                    onChange={(e) => updateField('monthlyPayment', Number(e.target.value))}
                  />
                </div>
              </div>
            </>
          )}

          {/* Expenses */}
          {activeSection === 'expenses' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Grundsteuer / Monat</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.monthlyTaxes || ''}
                    onChange={(e) => updateField('monthlyTaxes', Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Versicherung / Monat</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.monthlyInsurance || ''}
                    onChange={(e) => updateField('monthlyInsurance', Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Instandhaltungsrücklage / Monat</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.monthlyMaintenance || ''}
                    onChange={(e) => updateField('monthlyMaintenance', Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Hausgeld/Nebenkosten / Monat</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.monthlyHOA || ''}
                    onChange={(e) => updateField('monthlyHOA', Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-slate-300">Gesamt Nebenkosten / Monat:</span>
                  <span className="text-orange-400">
                    €{((formData.monthlyTaxes || 0) + (formData.monthlyInsurance || 0) + 
                       (formData.monthlyMaintenance || 0) + (formData.monthlyHOA || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Savings & Extra */}
          {activeSection === 'savings' && (
            <>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Sondertilgung / Jahr</label>
                <Input
                  type="number"
                  value={formData.specialRepayment || ''}
                  onChange={(e) => updateField('specialRepayment', Number(e.target.value))}
                  placeholder="0"
                />
                <p className="text-xs text-slate-500 mt-1">Zusätzliche jährliche Tilgung zur schnelleren Entschuldung</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Rücklagen Zielwert</label>
                  <Input
                    type="number"
                    value={formData.savingsTarget || ''}
                    onChange={(e) => updateField('savingsTarget', Number(e.target.value))}
                    placeholder="10000"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Aktuelle Rücklagen</label>
                  <Input
                    type="number"
                    value={formData.currentSavings || ''}
                    onChange={(e) => updateField('currentSavings', Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
              </div>
              {formData.savingsTarget && formData.savingsTarget > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Fortschritt:</span>
                    <span className="text-white">
                      {Math.round(((formData.currentSavings || 0) / formData.savingsTarget) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, ((formData.currentSavings || 0) / formData.savingsTarget) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Notizen</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="Zusätzliche Informationen..."
                  className="w-full border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-slate-500 min-h-[100px]"
                  style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
                />
              </div>
            </>
          )}

          <div className="flex gap-3 mt-6 pt-4 border-t border-slate-700">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
              Abbrechen
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Speichere...' : (initialData ? 'Aktualisieren' : 'Hinzufügen')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

// --- Property Simulator Component ---
const PropertySimulator: React.FC<{
  properties: RealEstateProperty[];
  privacy: boolean;
}> = ({ properties, privacy }) => {
  // Selected property
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(properties[0]?.id || '');
  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  // Simulation adjustments (deltas from current values)
  const [interestRateAdjust, setInterestRateAdjust] = useState(0); // ±% points
  const [valueAdjust, setValueAdjust] = useState(0); // ±% of current value
  const [annualAppreciation, setAnnualAppreciation] = useState(2.0); // % per year
  const [rentAdjust, setRentAdjust] = useState(0); // ±% of current rent
  const [extraRepayment, setExtraRepayment] = useState(0); // €/year additional
  const [expenseAdjust, setExpenseAdjust] = useState(0); // ±% of expenses
  const [vacancyMonths, setVacancyMonths] = useState(0); // months/year

  // Reset simulation when property changes
  useEffect(() => {
    setInterestRateAdjust(0);
    setValueAdjust(0);
    setAnnualAppreciation(2.0); // Default 2% per year
    setRentAdjust(0);
    setExtraRepayment(0);
    setExpenseAdjust(0);
    setVacancyMonths(0);
  }, [selectedPropertyId]);

  // Calculate simulated values
  const simulation = useMemo(() => {
    if (!selectedProperty) return null;

    const p = selectedProperty;
    
    // Current values
    const currentInterestRate = p.interestRate;
    const currentValue = p.currentValue;
    const currentRent = p.monthlyRent;
    const currentExpenses = p.monthlyTaxes + p.monthlyInsurance + p.monthlyMaintenance + p.monthlyHOA;
    const currentSpecialRepayment = p.specialRepayment;
    
    // Simulated values
    const simInterestRate = Math.max(0, currentInterestRate + interestRateAdjust);
    const simValue = currentValue * (1 + valueAdjust / 100);
    const simRent = currentRent * (1 + rentAdjust / 100);
    const simExpenses = currentExpenses * (1 + expenseAdjust / 100);
    const simSpecialRepayment = currentSpecialRepayment + extraRepayment;
    
    // Calculate new mortgage payment with new interest rate
    const loanAmount = p.loanAmount;
    const monthlyRate = simInterestRate / 100 / 12;
    const numPayments = p.loanTermYears * 12;
    
    let simMonthlyPayment = p.monthlyPayment;
    let simMonthlyInterest = p.monthlyInterest;
    let simMonthlyPrincipal = p.monthlyPrincipal;
    
    if (monthlyRate > 0 && loanAmount > 0) {
      simMonthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                          (Math.pow(1 + monthlyRate, numPayments) - 1);
      simMonthlyInterest = loanAmount * monthlyRate;
      simMonthlyPrincipal = simMonthlyPayment - simMonthlyInterest;
    }
    
    // Effective rent with vacancy
    const effectiveRent = simRent * (12 - vacancyMonths) / 12;
    
    // Cashflow calculations
    const currentTotalExpenses = p.monthlyPayment + currentExpenses;
    const currentEffectiveRent = p.isRented ? currentRent : 0;
    const currentCashflow = currentEffectiveRent - currentTotalExpenses;
    
    const simTotalExpenses = simMonthlyPayment + simExpenses;
    const simEffectiveRent = p.isRented ? effectiveRent : 0;
    const simCashflow = simEffectiveRent - simTotalExpenses;
    
    // Equity
    const currentEquity = currentValue - loanAmount;
    const simEquity = simValue - loanAmount;
    
    // Break-even rent (rent needed for cashflow = 0)
    const breakEvenRent = simTotalExpenses;
    
    // ROI on equity
    const currentROI = currentEquity > 0 ? (currentCashflow * 12 / currentEquity) * 100 : 0;
    const simROI = simEquity > 0 ? (simCashflow * 12 / simEquity) * 100 : 0;
    
    // Years to pay off loan
    const yearlyPrincipal = (simMonthlyPrincipal * 12) + simSpecialRepayment;
    const yearsToPayoff = yearlyPrincipal > 0 ? Math.ceil(loanAmount / yearlyPrincipal) : Infinity;
    const currentYearlyPrincipal = (p.monthlyPrincipal * 12) + p.specialRepayment;
    const currentYearsToPayoff = currentYearlyPrincipal > 0 ? Math.ceil(loanAmount / currentYearlyPrincipal) : Infinity;

    return {
      current: {
        interestRate: currentInterestRate,
        value: currentValue,
        rent: currentRent,
        expenses: currentExpenses,
        monthlyPayment: p.monthlyPayment,
        monthlyInterest: p.monthlyInterest,
        monthlyPrincipal: p.monthlyPrincipal,
        totalExpenses: currentTotalExpenses,
        effectiveRent: currentEffectiveRent,
        cashflow: currentCashflow,
        equity: currentEquity,
        roi: currentROI,
        yearsToPayoff: currentYearsToPayoff,
        specialRepayment: currentSpecialRepayment,
      },
      simulated: {
        interestRate: simInterestRate,
        value: simValue,
        rent: simRent,
        expenses: simExpenses,
        monthlyPayment: simMonthlyPayment,
        monthlyInterest: simMonthlyInterest,
        monthlyPrincipal: simMonthlyPrincipal,
        totalExpenses: simTotalExpenses,
        effectiveRent: simEffectiveRent,
        cashflow: simCashflow,
        equity: simEquity,
        roi: simROI,
        yearsToPayoff: yearsToPayoff,
        breakEvenRent: breakEvenRent,
        specialRepayment: simSpecialRepayment,
      },
      deltas: {
        monthlyPayment: simMonthlyPayment - p.monthlyPayment,
        cashflow: simCashflow - currentCashflow,
        equity: simEquity - currentEquity,
        roi: simROI - currentROI,
        yearsToPayoff: yearsToPayoff - currentYearsToPayoff,
      }
    };
  }, [selectedProperty, interestRateAdjust, valueAdjust, rentAdjust, extraRepayment, expenseAdjust, vacancyMonths]);

  // Projection data for chart
  const projectionData = useMemo(() => {
    if (!selectedProperty || !simulation) return [];
    
    const p = selectedProperty;
    const data = [];
    
    let currentDebt = p.loanAmount;
    let simDebt = p.loanAmount;
    
    const currentYearlyPrincipal = (p.monthlyPrincipal * 12) + p.specialRepayment;
    const simYearlyPrincipal = (simulation.simulated.monthlyPrincipal * 12) + simulation.simulated.specialRepayment;
    
    // Use annual appreciation percentage (convert to decimal)
    const appreciationRate = annualAppreciation / 100;
    
    for (let year = 0; year <= 20; year++) {
      // Current scenario: base value with annual appreciation
      const currentValue = p.currentValue * Math.pow(1 + appreciationRate, year);
      // Simulated scenario: adjusted base value (from valueAdjust slider) with annual appreciation
      const simValue = simulation.simulated.value * Math.pow(1 + appreciationRate, year);
      
      data.push({
        year: new Date().getFullYear() + year,
        currentEquity: Math.round(currentValue - Math.max(0, currentDebt)),
        simEquity: Math.round(simValue - Math.max(0, simDebt)),
        currentDebt: Math.round(Math.max(0, currentDebt)),
        simDebt: Math.round(Math.max(0, simDebt)),
        currentValue: Math.round(currentValue),
        simValue: Math.round(simValue),
      });
      
      currentDebt = Math.max(0, currentDebt - currentYearlyPrincipal);
      simDebt = Math.max(0, simDebt - simYearlyPrincipal);
    }
    
    return data;
  }, [selectedProperty, simulation, valueAdjust, annualAppreciation]);

  if (properties.length === 0) {
    return (
      <Card className="text-center py-12">
        <SlidersHorizontal size={48} className="mx-auto text-slate-600 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Keine Immobilien zum Simulieren</h3>
        <p className="text-slate-400">Füge zuerst eine Immobilie in der Übersicht hinzu.</p>
      </Card>
    );
  }

  if (!simulation) return null;

  const DeltaDisplay: React.FC<{ value: number; suffix?: string; inverted?: boolean }> = ({ value, suffix = '', inverted = false }) => {
    const isPositive = inverted ? value < 0 : value > 0;
    const isNegative = inverted ? value > 0 : value < 0;
    if (Math.abs(value) < 0.01) return null;
    return (
      <span className={`text-xs ml-2 ${isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-slate-400'}`}>
        {value > 0 ? '+' : ''}{value.toFixed(suffix === '%' ? 1 : 0)}{suffix}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Property Selector */}
      <Card>
        <div className="flex items-center gap-4">
          <label className="text-slate-400 text-sm font-medium">Immobilie auswählen:</label>
          <select
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="flex-1 bg-darker border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
            style={{ backgroundColor: '#0f172a' }}
          >
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name} - {p.address}</option>
            ))}
          </select>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sliders */}
        <Card>
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <SlidersHorizontal size={20} className="text-amber-400" /> Stellschrauben
          </h3>
          
          <div className="space-y-6">
            {/* Interest Rate */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-slate-400">Zinssatz-Änderung</label>
                <span className="font-bold text-white">
                  {simulation.simulated.interestRate.toFixed(2)}%
                  <DeltaDisplay value={interestRateAdjust} suffix="%" inverted />
                </span>
              </div>
              <input
                type="range"
                min="-3"
                max="5"
                step="0.25"
                value={interestRateAdjust}
                onChange={(e) => setInterestRateAdjust(Number(e.target.value))}
                className="w-full accent-amber-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>-3%</span>
                <span>Aktuell</span>
                <span>+5%</span>
              </div>
            </div>

            {/* Property Value */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-slate-400">Immobilienwert</label>
                <span className="font-bold text-white">
                  <Money value={simulation.simulated.value} privacy={privacy} fractionDigits={0} />
                  <DeltaDisplay value={valueAdjust} suffix="%" />
                </span>
              </div>
              <input
                type="range"
                min="-30"
                max="50"
                step="5"
                value={valueAdjust}
                onChange={(e) => setValueAdjust(Number(e.target.value))}
                className="w-full accent-amber-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>-30%</span>
                <span>Aktuell</span>
                <span>+50%</span>
              </div>
            </div>

            {/* Annual Appreciation */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-slate-400">Wertsteigerung pro Jahr</label>
                <span className="font-bold text-emerald-400">
                  {annualAppreciation >= 0 ? '+' : ''}{annualAppreciation.toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min="-2"
                max="8"
                step="0.25"
                value={annualAppreciation}
                onChange={(e) => setAnnualAppreciation(Number(e.target.value))}
                className="w-full accent-emerald-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>-2%</span>
                <span>2%</span>
                <span>8%</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Wertsteigerung pro Jahr in der Projektion</p>
            </div>

            {/* Monthly Rent */}
            {selectedProperty?.isRented && (
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-slate-400">Monatsmiete</label>
                  <span className="font-bold text-white">
                    <Money value={simulation.simulated.rent} privacy={privacy} fractionDigits={0} />
                    <DeltaDisplay value={rentAdjust} suffix="%" />
                  </span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="5"
                  value={rentAdjust}
                  onChange={(e) => setRentAdjust(Number(e.target.value))}
                  className="w-full accent-amber-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>-50%</span>
                  <span>Aktuell</span>
                  <span>+50%</span>
                </div>
              </div>
            )}

            {/* Vacancy */}
            {selectedProperty?.isRented && (
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-slate-400">Leerstand</label>
                  <span className="font-bold text-white">
                    {vacancyMonths} Monate/Jahr
                    {vacancyMonths > 0 && <span className="text-xs ml-2 text-red-400">-{Math.round(vacancyMonths/12*100)}% Miete</span>}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="6"
                  step="1"
                  value={vacancyMonths}
                  onChange={(e) => setVacancyMonths(Number(e.target.value))}
                  className="w-full accent-amber-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>Keine</span>
                  <span>3 Mon</span>
                  <span>6 Mon</span>
                </div>
              </div>
            )}

            {/* Extra Repayment */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-slate-400">Extra Sondertilgung/Jahr</label>
                <span className="font-bold text-white">
                  +<Money value={extraRepayment} privacy={privacy} fractionDigits={0} />
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="50000"
                step="1000"
                value={extraRepayment}
                onChange={(e) => setExtraRepayment(Number(e.target.value))}
                className="w-full accent-amber-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>€0</span>
                <span>€25k</span>
                <span>€50k</span>
              </div>
            </div>

            {/* Expenses */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-slate-400">Nebenkosten-Änderung</label>
                <span className="font-bold text-white">
                  <Money value={simulation.simulated.expenses} privacy={privacy} fractionDigits={0} />/Mo
                  <DeltaDisplay value={expenseAdjust} suffix="%" inverted />
                </span>
              </div>
              <input
                type="range"
                min="-20"
                max="50"
                step="5"
                value={expenseAdjust}
                onChange={(e) => setExpenseAdjust(Number(e.target.value))}
                className="w-full accent-amber-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>-20%</span>
                <span>Aktuell</span>
                <span>+50%</span>
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <Button
            variant="ghost"
            className="mt-6 w-full"
            onClick={() => {
              setInterestRateAdjust(0);
              setValueAdjust(0);
              setAnnualAppreciation(2.0);
              setRentAdjust(0);
              setExtraRepayment(0);
              setExpenseAdjust(0);
              setVacancyMonths(0);
            }}
          >
            Zurücksetzen
          </Button>
        </Card>

        {/* Results */}
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="text-center">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Monatliche Rate</p>
              <p className="text-xl font-bold text-white">
                <Money value={simulation.simulated.monthlyPayment} privacy={privacy} fractionDigits={0} />
              </p>
              <DeltaDisplay value={simulation.deltas.monthlyPayment} inverted />
            </Card>
            <Card className={`text-center ${simulation.simulated.cashflow >= 0 ? 'ring-1 ring-emerald-500/30' : 'ring-1 ring-red-500/30'}`}>
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Cashflow/Monat</p>
              <p className={`text-xl font-bold ${simulation.simulated.cashflow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                <Money value={simulation.simulated.cashflow} privacy={privacy} fractionDigits={0} sign />
              </p>
              <DeltaDisplay value={simulation.deltas.cashflow} />
            </Card>
            <Card className="text-center">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Eigenkapital</p>
              <p className="text-xl font-bold text-emerald-400">
                <Money value={simulation.simulated.equity} privacy={privacy} fractionDigits={0} />
              </p>
              <DeltaDisplay value={simulation.deltas.equity} />
            </Card>
            <Card className="text-center">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Jahre bis Tilgung</p>
              <p className="text-xl font-bold text-white">
                {simulation.simulated.yearsToPayoff === Infinity ? '∞' : simulation.simulated.yearsToPayoff}
              </p>
              {simulation.deltas.yearsToPayoff !== 0 && simulation.simulated.yearsToPayoff !== Infinity && (
                <DeltaDisplay value={-simulation.deltas.yearsToPayoff} suffix=" J." />
              )}
            </Card>
          </div>

          {/* Additional Metrics */}
          <Card>
            <h4 className="text-sm font-bold text-white mb-4">Detailberechnung</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Jährlicher Cashflow:</span>
                <span className={simulation.simulated.cashflow >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  <Money value={simulation.simulated.cashflow * 12} privacy={privacy} fractionDigits={0} sign />
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ROI auf Eigenkapital:</span>
                <span className={simulation.simulated.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {simulation.simulated.roi.toFixed(1)}%
                  <DeltaDisplay value={simulation.deltas.roi} suffix="%" />
                </span>
              </div>
              {selectedProperty?.isRented && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Break-Even Miete:</span>
                  <span className="text-white">
                    <Money value={simulation.simulated.breakEvenRent} privacy={privacy} fractionDigits={0} />/Mo
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Monatl. Zinsen (sim):</span>
                <span className="text-white">
                  <Money value={simulation.simulated.monthlyInterest} privacy={privacy} />
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Monatl. Tilgung (sim):</span>
                <span className="text-white">
                  <Money value={simulation.simulated.monthlyPrincipal} privacy={privacy} />
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Gesamte Sondertilgung/Jahr:</span>
                <span className="text-white">
                  <Money value={simulation.simulated.specialRepayment} privacy={privacy} fractionDigits={0} />
                </span>
              </div>
              {annualAppreciation !== 0 && (
                <>
                  <div className="border-t border-slate-700 pt-3 mt-3">
                    <p className="text-slate-400 text-xs mb-2">Prognose Eigenkapital (bei {annualAppreciation >= 0 ? '+' : ''}{annualAppreciation.toFixed(1)}% Wertsteigerung/Jahr):</p>
                    <div className="flex justify-between mt-2">
                      <span className="text-slate-400">Nach 5 Jahren:</span>
                      <span className="text-emerald-400 font-semibold">
                        <Money value={(() => {
                          const p = selectedProperty!;
                          const futureValue = simulation.simulated.value * Math.pow(1 + annualAppreciation / 100, 5);
                          const yearlyPrincipal = (simulation.simulated.monthlyPrincipal * 12) + simulation.simulated.specialRepayment;
                          const remainingDebt = Math.max(0, p.loanAmount - (yearlyPrincipal * 5));
                          return futureValue - remainingDebt;
                        })()} privacy={privacy} fractionDigits={0} />
                      </span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-slate-400">Nach 10 Jahren:</span>
                      <span className="text-emerald-400 font-semibold">
                        <Money value={(() => {
                          const p = selectedProperty!;
                          const futureValue = simulation.simulated.value * Math.pow(1 + annualAppreciation / 100, 10);
                          const yearlyPrincipal = (simulation.simulated.monthlyPrincipal * 12) + simulation.simulated.specialRepayment;
                          const remainingDebt = Math.max(0, p.loanAmount - (yearlyPrincipal * 10));
                          return futureValue - remainingDebt;
                        })()} privacy={privacy} fractionDigits={0} />
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Projection Chart */}
      <Card>
        <h3 className="text-lg font-bold text-white mb-4">Eigenkapital & Restschuld: Aktuell vs. Simulation (20 Jahre)</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={projectionData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="colorCurrentEquity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorSimEquity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => privacy ? '' : `€${val/1000}k`} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} 
                formatter={(val: number, name: string) => [privacy ? '****' : `€${val.toLocaleString()}`, name]}
                labelFormatter={(label) => `Jahr ${label}`}
              />
              <Legend />
              {/* Eigenkapital als Flächen */}
              <Area type="monotone" name="Aktuell (Eigenkapital)" dataKey="currentEquity" stroke="#6366f1" fill="url(#colorCurrentEquity)" strokeWidth={2} strokeDasharray="5 5" />
              <Area type="monotone" name="Simulation (Eigenkapital)" dataKey="simEquity" stroke="#f59e0b" fill="url(#colorSimEquity)" strokeWidth={3} />
              {/* Restschuld als Linien */}
              <Line type="monotone" name="Aktuell (Restschuld)" dataKey="currentDebt" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              <Line type="monotone" name="Simulation (Restschuld)" dataKey="simDebt" stroke="#f97316" strokeWidth={3} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-6 mt-4 text-xs text-slate-400 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-gradient-to-r from-indigo-500 to-amber-500"></div>
            <span>Eigenkapital steigt</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-gradient-to-r from-red-500 to-orange-500"></div>
            <span>Restschuld sinkt</span>
          </div>
        </div>
      </Card>

      {/* Tilgungsplan Tabelle */}
      <Card>
        <h3 className="text-lg font-bold text-white mb-4">Tilgungsplan (Jahresübersicht)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-700">
                <th className="text-left py-2 px-2">Jahr</th>
                <th className="text-right py-2 px-2">Restschuld (Aktuell)</th>
                <th className="text-right py-2 px-2">Restschuld (Sim)</th>
                <th className="text-right py-2 px-2">Ersparnis</th>
                <th className="text-right py-2 px-2">Eigenkapital (Sim)</th>
              </tr>
            </thead>
            <tbody>
              {projectionData.filter((_, i) => i % 2 === 0 || i === projectionData.length - 1).map((row, idx) => {
                const savings = row.currentDebt - row.simDebt;
                return (
                  <tr key={row.year} className={`border-b border-slate-800 ${idx % 2 === 0 ? 'bg-slate-800/20' : ''}`}>
                    <td className="py-2 px-2 text-white font-medium">{row.year}</td>
                    <td className="py-2 px-2 text-right text-red-400">
                      {privacy ? '****' : `€${row.currentDebt.toLocaleString()}`}
                    </td>
                    <td className="py-2 px-2 text-right text-orange-400">
                      {privacy ? '****' : `€${row.simDebt.toLocaleString()}`}
                    </td>
                    <td className={`py-2 px-2 text-right ${savings > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {privacy ? '****' : savings > 0 ? `+€${savings.toLocaleString()}` : '€0'}
                    </td>
                    <td className="py-2 px-2 text-right text-amber-400">
                      {privacy ? '****' : `€${row.simEquity.toLocaleString()}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ===================== TAX EÜR CALCULATOR =====================

const TaxEURCalculator: React.FC<{
  properties: RealEstateProperty[];
  privacy: boolean;
}> = ({ properties, privacy }) => {
  // Tax settings
  const [grenzsteuersatz, setGrenzsteuersatz] = useState(42);
  const [kirchensteuer, setKirchensteuer] = useState(false);
  const [soli, setSoli] = useState(false);

  // Additional income/expenses per property
  const [propertyDetails, setPropertyDetails] = useState<Record<string, {
    nebenkostenVorauszahlung: number;
    sonstigeEinnahmen: number;
    hausverwaltung: number;
    instandhaltung: number;
    fahrtkosten: number;
    sonstigeWerbungskosten: number;
    afaRate: number;
    baujahr: number;
  }>>({});

  // Initialize property details
  useEffect(() => {
    const initial: typeof propertyDetails = {};
    properties.forEach(p => {
      if (!propertyDetails[p.id]) {
        initial[p.id] = {
          nebenkostenVorauszahlung: 200,
          sonstigeEinnahmen: 0,
          hausverwaltung: 30,
          instandhaltung: p.monthlyMaintenance * 12,
          fahrtkosten: 100,
          sonstigeWerbungskosten: 0,
          afaRate: 2.0,
          baujahr: 1990,
        };
      } else {
        initial[p.id] = propertyDetails[p.id];
      }
    });
    if (Object.keys(initial).length > 0) {
      setPropertyDetails(prev => ({ ...prev, ...initial }));
    }
  }, [properties]);

  // Calculate EÜR for each property
  const eurCalculations = useMemo(() => {
    return properties.filter(p => p.isRented).map(p => {
      const details = propertyDetails[p.id] || {
        nebenkostenVorauszahlung: 200,
        sonstigeEinnahmen: 0,
        hausverwaltung: 30,
        instandhaltung: p.monthlyMaintenance * 12,
        fahrtkosten: 100,
        sonstigeWerbungskosten: 0,
        afaRate: 2.0,
        baujahr: 1990,
      };

      // EINNAHMEN
      const kaltmiete = p.monthlyRent * 12;
      const nebenkosten = details.nebenkostenVorauszahlung * 12;
      const sonstigeEinnahmen = details.sonstigeEinnahmen;
      const gesamtEinnahmen = kaltmiete + nebenkosten + sonstigeEinnahmen;

      // WERBUNGSKOSTEN
      // AfA: 2% for buildings after 1925, 2.5% for before
      const gebaeudewert = p.purchasePrice * 0.8; // 80% building, 20% land
      const afaRate = details.baujahr < 1925 ? 2.5 : details.afaRate;
      const afa = gebaeudewert * (afaRate / 100);

      const zinsen = p.monthlyInterest * 12;
      const grundsteuer = p.monthlyTaxes * 12;
      const versicherung = p.monthlyInsurance * 12;
      const hausgeld = p.monthlyHOA * 12 - nebenkosten; // Subtract recoverable costs
      const hausverwaltung = details.hausverwaltung * 12;
      const instandhaltung = details.instandhaltung;
      const fahrtkosten = details.fahrtkosten;
      const sonstige = details.sonstigeWerbungskosten;

      const gesamtWerbungskosten = afa + zinsen + grundsteuer + versicherung + Math.max(0, hausgeld) + hausverwaltung + instandhaltung + fahrtkosten + sonstige;

      // ERGEBNIS
      const einkuenfteVV = kaltmiete - gesamtWerbungskosten; // Only Kaltmiete counts for tax, Nebenkosten are pass-through
      
      // Tax calculation
      let effectiveRate = grenzsteuersatz;
      if (kirchensteuer) effectiveRate *= 1.09; // ~9% Kirchensteuer
      if (soli && grenzsteuersatz > 15) effectiveRate *= 1.055; // 5.5% Soli (above certain income)
      
      const steuerlast = einkuenfteVV > 0 ? einkuenfteVV * (effectiveRate / 100) : 0;
      const steuerersparnis = einkuenfteVV < 0 ? Math.abs(einkuenfteVV) * (effectiveRate / 100) : 0;

      // Cashflow comparison
      const cashflowVorSteuer = kaltmiete - (p.monthlyPayment * 12) - grundsteuer - versicherung - Math.max(0, hausgeld) - hausverwaltung - instandhaltung;
      const cashflowNachSteuer = cashflowVorSteuer - steuerlast + steuerersparnis;

      return {
        property: p,
        details,
        einnahmen: { kaltmiete, nebenkosten, sonstige: sonstigeEinnahmen, gesamt: gesamtEinnahmen },
        werbungskosten: { afa, zinsen, grundsteuer, versicherung, hausgeld: Math.max(0, hausgeld), hausverwaltung, instandhaltung, fahrtkosten, sonstige, gesamt: gesamtWerbungskosten },
        ergebnis: { einkuenfteVV, steuerlast, steuerersparnis, cashflowVorSteuer, cashflowNachSteuer },
      };
    });
  }, [properties, propertyDetails, grenzsteuersatz, kirchensteuer, soli]);

  // Totals
  const totals = useMemo(() => {
    return eurCalculations.reduce((acc, calc) => {
      acc.einnahmen += calc.einnahmen.kaltmiete;
      acc.werbungskosten += calc.werbungskosten.gesamt;
      acc.einkuenfteVV += calc.ergebnis.einkuenfteVV;
      acc.steuerlast += calc.ergebnis.steuerlast;
      acc.steuerersparnis += calc.ergebnis.steuerersparnis;
      acc.cashflowNachSteuer += calc.ergebnis.cashflowNachSteuer;
      return acc;
    }, { einnahmen: 0, werbungskosten: 0, einkuenfteVV: 0, steuerlast: 0, steuerersparnis: 0, cashflowNachSteuer: 0 });
  }, [eurCalculations]);

  const updatePropertyDetail = (propertyId: string, field: string, value: number) => {
    setPropertyDetails(prev => ({
      ...prev,
      [propertyId]: {
        ...prev[propertyId],
        [field]: value,
      },
    }));
  };

  if (properties.filter(p => p.isRented).length === 0) {
    return (
      <Card className="text-center py-12">
        <Receipt size={48} className="mx-auto text-slate-600 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Keine vermieteten Immobilien</h3>
        <p className="text-slate-400">Füge vermietete Immobilien hinzu, um die EÜR zu berechnen.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
          <Receipt size={24} className="text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Einnahmen-Überschuss-Rechnung</h3>
          <p className="text-slate-400 text-sm">Steuerliche Betrachtung Ihrer Mieteinnahmen</p>
        </div>
      </div>

      {/* Tax Settings */}
      <Card>
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Calculator size={18} className="text-purple-400" /> Steuereinstellungen
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Grenzsteuersatz (%)</label>
            <Input
              type="number"
              value={grenzsteuersatz}
              onChange={(e) => setGrenzsteuersatz(Number(e.target.value))}
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="kirchensteuer"
              checked={kirchensteuer}
              onChange={(e) => setKirchensteuer(e.target.checked)}
              className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500"
            />
            <label htmlFor="kirchensteuer" className="text-slate-300">Kirchensteuer (~9%)</label>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="soli"
              checked={soli}
              onChange={(e) => setSoli(e.target.checked)}
              className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500"
            />
            <label htmlFor="soli" className="text-slate-300">Solidaritätszuschlag (5.5%)</label>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-sm">Effektiver Steuersatz</p>
            <p className="text-2xl font-bold text-purple-400">
              {(grenzsteuersatz * (kirchensteuer ? 1.09 : 1) * (soli ? 1.055 : 1)).toFixed(1)}%
            </p>
          </div>
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="text-center">
          <p className="text-slate-400 text-xs uppercase mb-1">Mieteinnahmen</p>
          <p className="text-xl font-bold text-white"><Money value={totals.einnahmen} privacy={privacy} /></p>
          <p className="text-xs text-slate-500">pro Jahr</p>
        </Card>
        <Card className="text-center">
          <p className="text-slate-400 text-xs uppercase mb-1">Werbungskosten</p>
          <p className="text-xl font-bold text-red-400"><Money value={totals.werbungskosten} privacy={privacy} /></p>
          <p className="text-xs text-slate-500">pro Jahr</p>
        </Card>
        <Card className="text-center">
          <p className="text-slate-400 text-xs uppercase mb-1">Einkünfte V+V</p>
          <p className={`text-xl font-bold ${totals.einkuenfteVV >= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            <Money value={totals.einkuenfteVV} privacy={privacy} sign />
          </p>
          <p className="text-xs text-slate-500">steuerpflichtig</p>
        </Card>
        <Card className="text-center">
          <p className="text-slate-400 text-xs uppercase mb-1">Steuerlast/-ersparnis</p>
          <p className={`text-xl font-bold ${totals.steuerlast > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            <Money value={totals.steuerersparnis - totals.steuerlast} privacy={privacy} sign />
          </p>
          <p className="text-xs text-slate-500">pro Jahr</p>
        </Card>
        <Card className="text-center">
          <p className="text-slate-400 text-xs uppercase mb-1">Cashflow n. Steuer</p>
          <p className={`text-xl font-bold ${totals.cashflowNachSteuer >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            <Money value={totals.cashflowNachSteuer} privacy={privacy} sign />
          </p>
          <p className="text-xs text-slate-500">pro Jahr</p>
        </Card>
        <Card className="text-center">
          <p className="text-slate-400 text-xs uppercase mb-1">Monatl. Netto</p>
          <p className={`text-xl font-bold ${totals.cashflowNachSteuer >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            <Money value={totals.cashflowNachSteuer / 12} privacy={privacy} sign />
          </p>
          <p className="text-xs text-slate-500">pro Monat</p>
        </Card>
      </div>

      {/* Per Property EÜR */}
      {eurCalculations.map(calc => (
        <Card key={calc.property.id}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-semibold text-white">{calc.property.name}</h4>
              <p className="text-slate-400 text-sm">{calc.property.address}</p>
            </div>
            <Badge className={calc.ergebnis.einkuenfteVV >= 0 ? 'bg-amber-500' : 'bg-emerald-500'}>
              {calc.ergebnis.einkuenfteVV >= 0 ? 'Steuerpflichtig' : 'Steuermindernd'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Einnahmen */}
            <div>
              <h5 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-3">Einnahmen</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Kaltmiete (12 × €{calc.property.monthlyRent})</span>
                  <span className="text-white"><Money value={calc.einnahmen.kaltmiete} privacy={privacy} /></span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Nebenkostenvorauszahlung</span>
                  <Input
                    type="number"
                    value={calc.details.nebenkostenVorauszahlung}
                    onChange={(e) => updatePropertyDetail(calc.property.id, 'nebenkostenVorauszahlung', Number(e.target.value))}
                    className="w-24 text-right text-sm py-1"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Sonstige Einnahmen</span>
                  <Input
                    type="number"
                    value={calc.details.sonstigeEinnahmen}
                    onChange={(e) => updatePropertyDetail(calc.property.id, 'sonstigeEinnahmen', Number(e.target.value))}
                    className="w-24 text-right text-sm py-1"
                  />
                </div>
                <div className="border-t border-slate-700 pt-2 flex justify-between font-semibold">
                  <span className="text-slate-300">Gesamt Einnahmen</span>
                  <span className="text-emerald-400"><Money value={calc.einnahmen.gesamt} privacy={privacy} /></span>
                </div>
              </div>
            </div>

            {/* Werbungskosten */}
            <div>
              <h5 className="text-sm font-semibold text-red-400 uppercase tracking-wide mb-3">Werbungskosten</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">AfA ({calc.details.afaRate}% linear)</span>
                  <span className="text-white"><Money value={calc.werbungskosten.afa} privacy={privacy} /></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Schuldzinsen</span>
                  <span className="text-white"><Money value={calc.werbungskosten.zinsen} privacy={privacy} /></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Grundsteuer</span>
                  <span className="text-white"><Money value={calc.werbungskosten.grundsteuer} privacy={privacy} /></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Versicherung</span>
                  <span className="text-white"><Money value={calc.werbungskosten.versicherung} privacy={privacy} /></span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Hausverwaltung/Mo</span>
                  <Input
                    type="number"
                    value={calc.details.hausverwaltung}
                    onChange={(e) => updatePropertyDetail(calc.property.id, 'hausverwaltung', Number(e.target.value))}
                    className="w-24 text-right text-sm py-1"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Instandhaltung/Jahr</span>
                  <Input
                    type="number"
                    value={calc.details.instandhaltung}
                    onChange={(e) => updatePropertyDetail(calc.property.id, 'instandhaltung', Number(e.target.value))}
                    className="w-24 text-right text-sm py-1"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Fahrtkosten</span>
                  <Input
                    type="number"
                    value={calc.details.fahrtkosten}
                    onChange={(e) => updatePropertyDetail(calc.property.id, 'fahrtkosten', Number(e.target.value))}
                    className="w-24 text-right text-sm py-1"
                  />
                </div>
                <div className="border-t border-slate-700 pt-2 flex justify-between font-semibold">
                  <span className="text-slate-300">Gesamt Werbungskosten</span>
                  <span className="text-red-400"><Money value={calc.werbungskosten.gesamt} privacy={privacy} /></span>
                </div>
              </div>
            </div>

            {/* Ergebnis */}
            <div>
              <h5 className="text-sm font-semibold text-purple-400 uppercase tracking-wide mb-3">Ergebnis</h5>
              <div className="space-y-3">
                <div className="bg-slate-800 p-3 rounded-lg">
                  <p className="text-slate-400 text-xs">Einkünfte aus V+V</p>
                  <p className={`text-2xl font-bold ${calc.ergebnis.einkuenfteVV >= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    <Money value={calc.ergebnis.einkuenfteVV} privacy={privacy} sign />
                  </p>
                </div>
                {calc.ergebnis.einkuenfteVV >= 0 ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Steuerlast ({grenzsteuersatz}%)</span>
                    <span className="text-red-400"><Money value={calc.ergebnis.steuerlast} privacy={privacy} /></span>
                  </div>
                ) : (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Steuerersparnis ({grenzsteuersatz}%)</span>
                    <span className="text-emerald-400"><Money value={calc.ergebnis.steuerersparnis} privacy={privacy} /></span>
                  </div>
                )}
                <div className="border-t border-slate-700 pt-3">
                  <p className="text-slate-400 text-xs mb-1">Cashflow nach Steuern</p>
                  <p className={`text-xl font-bold ${calc.ergebnis.cashflowNachSteuer >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    <Money value={calc.ergebnis.cashflowNachSteuer} privacy={privacy} sign /> / Jahr
                  </p>
                  <p className="text-slate-400 text-sm">
                    = <Money value={calc.ergebnis.cashflowNachSteuer / 12} privacy={privacy} sign /> / Monat
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}

      {/* Info Box */}
      <Card className="bg-slate-800/50 border border-slate-700">
        <h4 className="text-sm font-semibold text-white mb-2">Hinweise zur EÜR</h4>
        <ul className="text-xs text-slate-400 space-y-1">
          <li>• <strong>AfA (Absetzung für Abnutzung):</strong> Linear 2% für Gebäude ab 1925, 2.5% für ältere Gebäude (Bemessungsgrundlage: 80% des Kaufpreises)</li>
          <li>• <strong>Schuldzinsen:</strong> Nur der Zinsanteil der Kreditrate ist absetzbar, nicht die Tilgung</li>
          <li>• <strong>Negative Einkünfte:</strong> Können mit anderen Einkünften verrechnet werden und mindern die Gesamtsteuerlast</li>
          <li>• <strong>Nebenkosten:</strong> Werden in der Regel 1:1 auf Mieter umgelegt und sind daher steuerneutral</li>
          <li>• Diese Berechnung ersetzt keine Steuerberatung. Bitte konsultieren Sie einen Steuerberater für Ihre individuelle Situation.</li>
        </ul>
      </Card>
    </div>
  );
};

// ===================== BUSINESS PLAN CALCULATOR =====================

interface BusinessPlanCost {
  id: string;
  name: string;
  amount: number;
  description?: string;
}

interface NebenkostenItem {
  id: string;
  name: string;
  amount: number;
  description?: string;
}

interface UnitConfig {
  id: string;
  name: string;
  size: number; // m²
  monthlyRent: number;
  marketValue: number;
  isOwned: boolean; // true = Investor, false = Grundstücksbesitzer
}

interface TimelinePhase {
  id: string;
  name: string;
  startMonth: number;
  endMonth: number;
  color: string;
  icon: React.ReactNode;
}

const DEFAULT_BP_COSTS: BusinessPlanCost[] = [
  { id: 'rueckbau', name: 'Rückbau & Abriss', amount: 35000, description: 'Altes Gebäude entfernen, Loch ausheben' },
  { id: 'keller', name: 'Keller', amount: 155000, description: 'Untergeschoss inkl. Abdichtung' },
  { id: 'garten', name: 'Garten & Stellplätze', amount: 30000, description: 'Außenanlagen, Parkplätze' },
  { id: 'rohbau', name: 'Rohbau', amount: 450000, description: 'Mauerwerk, Dach, Fenster, Türen' },
  { id: 'heizung', name: 'Heizung & Sanitär', amount: 75000, description: '~15.000€ pro Wohnung' },
  { id: 'elektrik', name: 'Elektrik', amount: 10000, description: 'Material (Eigenleistung)' },
  { id: 'innenausbau', name: 'Innenausbau', amount: 50000, description: 'Rigips, Estrich, Malerarbeiten' },
  { id: 'fliesen', name: 'Fliesenleger', amount: 30000, description: 'Bäder, Küchen, Flure' },
  { id: 'kuechen', name: 'Küchen', amount: 30000, description: '~6.000€ pro Küche' },
];

const DEFAULT_UNITS: UnitConfig[] = [
  { id: '1', name: 'Wohnung 1', size: 80, monthlyRent: 1500, marketValue: 500000, isOwned: true },
  { id: '2', name: 'Wohnung 2', size: 80, monthlyRent: 1500, marketValue: 500000, isOwned: true },
  { id: '3', name: 'Wohnung 3 (Penthouse)', size: 120, monthlyRent: 2500, marketValue: 1000000, isOwned: true },
  { id: '4', name: 'Wohnung 4', size: 70, monthlyRent: 1200, marketValue: 400000, isOwned: false },
  { id: '5', name: 'Wohnung 5', size: 70, monthlyRent: 1200, marketValue: 400000, isOwned: false },
];

const DEFAULT_NEBENKOSTEN: NebenkostenItem[] = [
  { id: 'architekt', name: 'Architekt & Statik', amount: 0, description: '3-5% der Baukosten' },
  { id: 'baugenehmigung', name: 'Baugenehmigung & Behörden', amount: 0, description: 'Bauantrag, Prüfungen' },
  { id: 'vermessung', name: 'Vermessung & Bodengutachten', amount: 0, description: 'Baugrundgutachten, Absteckung' },
  { id: 'versicherung', name: 'Bauversicherung', amount: 0, description: 'Bauleistungs-, Bauherrenhaftpflicht' },
  { id: 'anschluss', name: 'Anschlusskosten', amount: 0, description: 'Strom, Wasser, Kanal, Gas' },
  { id: 'notar', name: 'Notar & Grundbuch', amount: 0, description: 'Grundschuldbestellung, Teilungserklärung' },
  { id: 'finanzierung', name: 'Finanzierungskosten', amount: 0, description: 'Bereitstellungszinsen, Schätzkosten' },
  { id: 'sonstiges', name: 'Sonstiges & Puffer', amount: 0, description: 'Unvorhergesehenes' },
];

const BUSINESS_PLAN_ID = 'default-businessplan';

const BusinessPlanCalculator: React.FC<{ privacy: boolean }> = ({ privacy }) => {
  // State for collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    costs: true,
    units: true,
    financing: true,
    economics: true,
    timeline: false,
    risk: false,
  });

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // Costs state
  const [costs, setCosts] = useState<BusinessPlanCost[]>(DEFAULT_BP_COSTS);
  const [nebenkostenItems, setNebenkostenItems] = useState<NebenkostenItem[]>(DEFAULT_NEBENKOSTEN);
  const [showNebenkostenDetail, setShowNebenkostenDetail] = useState(false);
  const [baukostenzuschuss, setBaukostenzuschuss] = useState(0); // Zuschuss von BEG, KfW etc.

  // Units state
  const [units, setUnits] = useState<UnitConfig[]>(DEFAULT_UNITS);
  const [pricePerSqm, setPricePerSqm] = useState(5500); // EUR/m²

  // Financing state
  const [eigenkapital, setEigenkapital] = useState(100000);
  const [zinssatz, setZinssatz] = useState(3.6);
  const [tilgung, setTilgung] = useState(2.0);
  const [zinsbindung, setZinsbindung] = useState(15);

  // Risk analysis state
  const [costOverrun, setCostOverrun] = useState(0); // % over budget
  const [vacancyMonths, setVacancyMonths] = useState(0); // months/year
  const [futureInterestIncrease, setFutureInterestIncrease] = useState(0); // % increase after Zinsbindung

  // Operating expenses
  const [bewirtschaftungskostenPercent, setBewirtschaftungskostenPercent] = useState(25);

  // Load saved data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const plans = await StorageService.getBusinessPlans();
        const savedPlan = plans.find(p => p.id === BUSINESS_PLAN_ID);
        
        if (savedPlan) {
          setCosts(savedPlan.costs as BusinessPlanCost[]);
          setNebenkostenItems(savedPlan.nebenkostenItems as NebenkostenItem[]);
          setBaukostenzuschuss(savedPlan.baukostenzuschuss);
          setUnits(savedPlan.units as UnitConfig[]);
          if (savedPlan.pricePerSqm) setPricePerSqm(savedPlan.pricePerSqm);
          setEigenkapital(savedPlan.eigenkapital);
          setZinssatz(savedPlan.zinssatz);
          setTilgung(savedPlan.tilgung);
          setZinsbindung(savedPlan.zinsbindung);
          setBewirtschaftungskostenPercent(savedPlan.bewirtschaftungskostenPercent);
          setCostOverrun(savedPlan.costOverrun);
          setVacancyMonths(savedPlan.vacancyMonths);
          setFutureInterestIncrease(savedPlan.futureInterestIncrease);
          setLastSaved(savedPlan.lastUpdated);
        }
      } catch (e) {
        console.error("Failed to load business plan:", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Auto-save when data changes (debounced)
  useEffect(() => {
    if (isLoading) return; // Don't save while loading

    const saveTimeout = setTimeout(async () => {
      setIsSaving(true);
      try {
        const planData: BusinessPlanData = {
          id: BUSINESS_PLAN_ID,
          name: 'Businessplan Mehrfamilienhaus',
          lastUpdated: new Date().toISOString(),
          costs: costs.map(c => ({ id: c.id, name: c.name, amount: c.amount, description: c.description })),
          nebenkostenItems: nebenkostenItems.map(n => ({ id: n.id, name: n.name, amount: n.amount, description: n.description })),
          baukostenzuschuss,
          units: units.map(u => ({ id: u.id, name: u.name, size: u.size, monthlyRent: u.monthlyRent, marketValue: u.size * pricePerSqm, isOwned: u.isOwned })),
          pricePerSqm,
          eigenkapital,
          zinssatz,
          tilgung,
          zinsbindung,
          bewirtschaftungskostenPercent,
          costOverrun,
          vacancyMonths,
          futureInterestIncrease,
        };
        await StorageService.saveBusinessPlan(planData);
        setLastSaved(planData.lastUpdated);
      } catch (e) {
        console.error("Failed to save business plan:", e);
      } finally {
        setIsSaving(false);
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(saveTimeout);
  }, [costs, nebenkostenItems, baukostenzuschuss, units, pricePerSqm, eigenkapital, zinssatz, tilgung, zinsbindung, bewirtschaftungskostenPercent, costOverrun, vacancyMonths, futureInterestIncrease, isLoading]);

  // Toggle section
  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Update cost
  const updateCost = (id: string, amount: number) => {
    setCosts(prev => prev.map(c => c.id === id ? { ...c, amount } : c));
  };

  // Update nebenkosten item
  const updateNebenkostenItem = (id: string, amount: number) => {
    setNebenkostenItems(prev => prev.map(n => n.id === id ? { ...n, amount } : n));
  };

  // Update unit
  const updateUnit = (id: string, field: keyof UnitConfig, value: number | boolean | string) => {
    setUnits(prev => prev.map(u => u.id === id ? { ...u, [field]: value } : u));
  };

  // Add new unit
  const addUnit = () => {
    const newId = (units.length + 1).toString();
    setUnits([...units, {
      id: newId,
      name: `Wohnung ${newId}`,
      size: 70,
      monthlyRent: 1200,
      marketValue: 400000,
      isOwned: false,
    }]);
  };

  // Remove unit
  const removeUnit = (id: string) => {
    setUnits(prev => prev.filter(u => u.id !== id));
  };

  // Calculations
  const calculations = useMemo(() => {
    // Total costs
    const baseCosts = costs.reduce((sum, c) => sum + c.amount, 0);
    const nebenkosten = nebenkostenItems.reduce((sum, n) => sum + n.amount, 0);
    const totalCostsBase = baseCosts + nebenkosten;
    const totalCostsWithOverrun = totalCostsBase * (1 + costOverrun / 100);
    // Kosten nach Abzug des Baukostenzuschusses
    const totalCostsNetto = Math.max(0, totalCostsWithOverrun - baukostenzuschuss);

    // Units analysis - Market value calculated from pricePerSqm
    const ownedUnits = units.filter(u => u.isOwned);
    const otherUnits = units.filter(u => !u.isOwned);
    const totalMonthlyRent = ownedUnits.reduce((sum, u) => sum + u.monthlyRent, 0);
    const totalMarketValue = ownedUnits.reduce((sum, u) => sum + u.size * pricePerSqm, 0);
    const totalSize = ownedUnits.reduce((sum, u) => sum + u.size, 0);
    const allUnitsMarketValue = units.reduce((sum, u) => sum + u.size * pricePerSqm, 0);

    // Financing - basierend auf Nettokosten (nach Zuschuss)
    const kreditbetrag = Math.max(0, totalCostsNetto - eigenkapital);
    const annualRate = (zinssatz + tilgung) / 100;
    const monthlyRate = kreditbetrag * annualRate / 12;
    const yearlyRate = monthlyRate * 12;

    // After Zinsbindung
    const futureZinssatz = zinssatz + futureInterestIncrease;
    const futureAnnualRate = (futureZinssatz + tilgung) / 100;
    
    // Approximate remaining debt after Zinsbindung
    let remainingDebt = kreditbetrag;
    for (let i = 0; i < zinsbindung; i++) {
      const yearlyInterest = remainingDebt * (zinssatz / 100);
      const yearlyPrincipal = yearlyRate - yearlyInterest;
      remainingDebt = Math.max(0, remainingDebt - yearlyPrincipal);
    }
    const futureMonthlyRate = remainingDebt * futureAnnualRate / 12;

    // Years to payoff
    let debt = kreditbetrag;
    let years = 0;
    while (debt > 0 && years < 50) {
      const interest = debt * (zinssatz / 100);
      const principal = yearlyRate - interest;
      debt = Math.max(0, debt - principal);
      years++;
    }

    // Economic calculations
    const yearlyRentGross = totalMonthlyRent * 12;
    const effectiveYearlyRent = totalMonthlyRent * (12 - vacancyMonths);
    const bewirtschaftungskosten = effectiveYearlyRent * (bewirtschaftungskostenPercent / 100);
    const noi = effectiveYearlyRent - bewirtschaftungskosten;
    const dscr = yearlyRate > 0 ? noi / yearlyRate : 0;
    const cashflowBeforeTax = noi - yearlyRate;
    const monthlyCashflow = cashflowBeforeTax / 12;

    // ROI on equity
    const roiEquity = eigenkapital > 0 ? (cashflowBeforeTax / eigenkapital) * 100 : 0;

    // Mietrendite
    const bruttomietrendite = totalMarketValue > 0 ? (yearlyRentGross / totalMarketValue) * 100 : 0;
    const nettomietrendite = totalMarketValue > 0 ? (noi / totalMarketValue) * 100 : 0;

    return {
      // Costs
      baseCosts,
      nebenkosten,
      totalCostsBase,
      totalCostsWithOverrun,
      totalCostsNetto,
      baukostenzuschuss,
      // Units
      ownedUnits,
      otherUnits,
      totalMonthlyRent,
      totalMarketValue,
      totalSize,
      allUnitsMarketValue,
      pricePerSqm,
      // Financing
      kreditbetrag,
      monthlyRate,
      yearlyRate,
      remainingDebt,
      futureMonthlyRate,
      yearsToPayoff: years,
      // Economics
      yearlyRentGross,
      effectiveYearlyRent,
      bewirtschaftungskosten,
      noi,
      dscr,
      cashflowBeforeTax,
      monthlyCashflow,
      roiEquity,
      bruttomietrendite,
      nettomietrendite,
    };
  }, [costs, nebenkostenItems, costOverrun, baukostenzuschuss, units, pricePerSqm, eigenkapital, zinssatz, tilgung, zinsbindung, vacancyMonths, futureInterestIncrease, bewirtschaftungskostenPercent]);

  // Timeline phases
  const timelinePhases: TimelinePhase[] = [
    { id: 'planung', name: 'Planung & Genehmigung', startMonth: -6, endMonth: -1, color: 'bg-blue-500', icon: <FileText size={14} /> },
    { id: 'finanzierung', name: 'Finanzierung', startMonth: -3, endMonth: 0, color: 'bg-purple-500', icon: <PiggyBank size={14} /> },
    { id: 'bau', name: 'Bauphase', startMonth: 0, endMonth: 9, color: 'bg-amber-500', icon: <HardHat size={14} /> },
    { id: 'vermarktung', name: 'Vermarktung', startMonth: 5, endMonth: 10, color: 'bg-emerald-500', icon: <Users size={14} /> },
    { id: 'uebergabe', name: 'Fertigstellung & Übergabe', startMonth: 9, endMonth: 11, color: 'bg-teal-500', icon: <Home size={14} /> },
    { id: 'vollvermietung', name: 'Vollvermietung', startMonth: 10, endMonth: 12, color: 'bg-green-500', icon: <CheckCircle2 size={14} /> },
  ];

  // Section Header Component
  const SectionHeader: React.FC<{ id: string; title: string; icon: React.ReactNode; color: string }> = ({ id, title, icon, color }) => (
    <div
      className={`flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/50 rounded-lg transition-colors`}
      onClick={() => toggleSection(id)}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
          {icon}
        </div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
      </div>
      {expandedSections[id] ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
    </div>
  );

  // DSCR color helper
  const getDSCRColor = (dscr: number) => {
    if (dscr >= 1.2) return 'text-emerald-400';
    if (dscr >= 1.0) return 'text-amber-400';
    return 'text-red-400';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="ml-3 text-slate-400">Lade Businessplan...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <FileText size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Businessplan Mehrfamilienhaus</h2>
            <p className="text-slate-400 text-sm">Interaktive Kalkulation für Ihr Bauprojekt</p>
          </div>
        </div>
        
        {/* Save Status */}
        <div className="flex items-center gap-2">
          {isSaving ? (
            <div className="flex items-center gap-2 text-amber-400 text-sm">
              <Loader2 size={16} className="animate-spin" />
              Speichern...
            </div>
          ) : lastSaved ? (
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle size={16} />
              Gespeichert
            </div>
          ) : null}
        </div>
      </div>

      {/* Executive Summary */}
      <Card className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border-indigo-500/30">
        <h3 className="text-lg font-bold text-white mb-4">Executive Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="text-center">
            <p className="text-slate-400 text-xs uppercase mb-1">Baukosten (netto)</p>
            <p className="text-xl font-bold text-white"><Money value={calculations.totalCostsNetto} privacy={privacy} fractionDigits={0} /></p>
            {calculations.baukostenzuschuss > 0 && (
              <p className="text-xs text-emerald-400 mt-1">inkl. Zuschuss -<Money value={calculations.baukostenzuschuss} privacy={privacy} fractionDigits={0} /></p>
            )}
          </div>
          <div className="text-center">
            <p className="text-slate-400 text-xs uppercase mb-1">Marktwert (Eigentum)</p>
            <p className="text-xl font-bold text-emerald-400"><Money value={calculations.totalMarketValue} privacy={privacy} fractionDigits={0} /></p>
          </div>
          <div className="text-center">
            <p className="text-slate-400 text-xs uppercase mb-1">Mieteinnahmen/Jahr</p>
            <p className="text-xl font-bold text-blue-400"><Money value={calculations.yearlyRentGross} privacy={privacy} fractionDigits={0} /></p>
          </div>
          <div className="text-center">
            <p className="text-slate-400 text-xs uppercase mb-1">DSCR</p>
            <p className={`text-xl font-bold ${getDSCRColor(calculations.dscr)}`}>{calculations.dscr.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-400 text-xs uppercase mb-1">Cashflow/Monat</p>
            <p className={`text-xl font-bold ${calculations.monthlyCashflow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              <Money value={calculations.monthlyCashflow} privacy={privacy} fractionDigits={0} sign />
            </p>
          </div>
          <div className="text-center">
            <p className="text-slate-400 text-xs uppercase mb-1">Tilgung in</p>
            <p className="text-xl font-bold text-white">{calculations.yearsToPayoff} Jahren</p>
          </div>
        </div>
      </Card>

      {/* 1. Kostenaufstellung */}
      <Card>
        <SectionHeader id="costs" title="Kostenaufstellung" icon={<Calculator size={16} className="text-white" />} color="bg-amber-500" />
        {expandedSections.costs && (
          <div className="mt-4 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 text-sm border-b border-slate-700">
                    <th className="py-2 px-2">Position</th>
                    <th className="py-2 px-2">Beschreibung</th>
                    <th className="py-2 px-2 text-right">Betrag (€)</th>
                  </tr>
                </thead>
                <tbody>
                  {costs.map(cost => (
                    <tr key={cost.id} className="border-b border-slate-800">
                      <td className="py-3 px-2 text-white font-medium">{cost.name}</td>
                      <td className="py-3 px-2 text-slate-400 text-sm">{cost.description}</td>
                      <td className="py-3 px-2 text-right">
                        <Input
                          type="number"
                          value={cost.amount}
                          onChange={(e) => updateCost(cost.id, Number(e.target.value))}
                          className="w-32 text-right"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Nebenkosten Section */}
            <div className="border border-slate-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowNebenkostenDetail(!showNebenkostenDetail)}
                className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-slate-400">Nebenkosten:</span>
                  <span className="text-amber-400 font-bold"><Money value={calculations.nebenkosten} privacy={privacy} fractionDigits={0} /></span>
                  <span className="text-slate-500 text-sm">
                    ({calculations.baseCosts > 0 ? ((calculations.nebenkosten / calculations.baseCosts) * 100).toFixed(1) : 0}% der Baukosten)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Details {showNebenkostenDetail ? 'ausblenden' : 'anzeigen'}</span>
                  {showNebenkostenDetail ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>
              </button>

              {showNebenkostenDetail && (
                <div className="p-4 bg-slate-900/50 border-t border-slate-700">
                  <div className="space-y-3">
                    {nebenkostenItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors">
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm">{item.name}</p>
                          {item.description && (
                            <p className="text-slate-500 text-xs mt-1">{item.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={item.amount}
                            onChange={(e) => updateNebenkostenItem(item.id, Number(e.target.value))}
                            className="w-32 text-right"
                            placeholder="0"
                          />
                          <span className="text-slate-400 text-sm">€</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-300 font-semibold">Summe Nebenkosten</span>
                      <span className="text-amber-400 font-bold text-lg">
                        <Money value={calculations.nebenkosten} privacy={privacy} fractionDigits={0} />
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <div className="flex items-center gap-4">
                <span className="text-slate-400">Baukostenzuschuss:</span>
                <Input
                  type="number"
                  value={baukostenzuschuss}
                  onChange={(e) => setBaukostenzuschuss(Number(e.target.value))}
                  className="w-40"
                  placeholder="0"
                />
                <span className="text-slate-400 text-sm">€ (z.B. BEG, KfW)</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-sm">= </span>
                <span className="text-emerald-400 font-bold">-<Money value={calculations.baukostenzuschuss} privacy={privacy} fractionDigits={0} /></span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              <div className="p-4 bg-slate-800 rounded-lg">
                <p className="text-slate-400 text-sm">Baukosten (Basis)</p>
                <p className="text-2xl font-bold text-white"><Money value={calculations.baseCosts} privacy={privacy} fractionDigits={0} /></p>
              </div>
              <div className="p-4 bg-slate-800 rounded-lg">
                <p className="text-slate-400 text-sm">+ Nebenkosten</p>
                <p className="text-2xl font-bold text-amber-400"><Money value={calculations.nebenkosten} privacy={privacy} fractionDigits={0} /></p>
              </div>
              {calculations.baukostenzuschuss > 0 && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <p className="text-emerald-300 text-sm">- Baukostenzuschuss</p>
                  <p className="text-2xl font-bold text-emerald-400">-<Money value={calculations.baukostenzuschuss} privacy={privacy} fractionDigits={0} /></p>
                </div>
              )}
              <div className={`p-4 rounded-lg ${calculations.baukostenzuschuss > 0 ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-amber-500/10 border border-amber-500/30'} ${calculations.baukostenzuschuss > 0 ? 'md:col-span-3' : 'md:col-span-1'}`}>
                <p className={`text-sm ${calculations.baukostenzuschuss > 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {calculations.baukostenzuschuss > 0 ? 'Netto-Gesamtkosten' : 'Gesamtkosten'}
                </p>
                <p className={`text-2xl font-bold ${calculations.baukostenzuschuss > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  <Money value={calculations.totalCostsNetto} privacy={privacy} fractionDigits={0} />
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 2. Wohneinheiten */}
      <Card>
        <SectionHeader id="units" title="Wohneinheiten" icon={<Home size={16} className="text-white" />} color="bg-blue-500" />
        {expandedSections.units && (
          <div className="mt-4 space-y-4">
            {/* Price per sqm Slider */}
            <div className="p-4 bg-gradient-to-r from-blue-900/30 to-indigo-900/30 rounded-lg border border-blue-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-300 font-medium">Preis pro m²</span>
                <span className="text-2xl font-bold text-blue-400">€{pricePerSqm.toLocaleString()}/m²</span>
              </div>
              <input
                type="range"
                min="2000"
                max="12000"
                step="100"
                value={pricePerSqm}
                onChange={(e) => setPricePerSqm(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>€2.000</span>
                <span>€12.000</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 text-sm border-b border-slate-700">
                    <th className="py-2 px-2">Einheit</th>
                    <th className="py-2 px-2 text-center">m²</th>
                    <th className="py-2 px-2 text-center">Miete/Mo (€)</th>
                    <th className="py-2 px-2 text-center">Marktwert (berechnet)</th>
                    <th className="py-2 px-2 text-center">Eigentum</th>
                    <th className="py-2 px-2 text-center">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map(unit => (
                    <tr key={unit.id} className={`border-b border-slate-800 ${unit.isOwned ? 'bg-emerald-500/5' : ''}`}>
                      <td className="py-3 px-2">
                        <Input
                          type="text"
                          value={unit.name}
                          onChange={(e) => updateUnit(unit.id, 'name', e.target.value)}
                          className="w-40"
                        />
                      </td>
                      <td className="py-3 px-2 text-center">
                        <Input
                          type="number"
                          value={unit.size}
                          onChange={(e) => updateUnit(unit.id, 'size', Number(e.target.value))}
                          className="w-20 text-center"
                        />
                      </td>
                      <td className="py-3 px-2 text-center">
                        <Input
                          type="number"
                          value={unit.monthlyRent}
                          onChange={(e) => updateUnit(unit.id, 'monthlyRent', Number(e.target.value))}
                          className="w-24 text-center"
                        />
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="text-blue-400 font-medium">
                          €{(unit.size * pricePerSqm).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={unit.isOwned}
                          onChange={(e) => updateUnit(unit.id, 'isOwned', e.target.checked)}
                          className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-emerald-500"
                        />
                      </td>
                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={() => removeUnit(unit.id)}
                          className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button variant="ghost" onClick={addUnit} className="w-full">
              <Plus size={16} /> Wohnung hinzufügen
            </Button>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <p className="text-emerald-300 text-sm">Im Eigentum ({calculations.ownedUnits.length})</p>
                <p className="text-xl font-bold text-emerald-400">{calculations.totalSize} m²</p>
              </div>
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <p className="text-emerald-300 text-sm">Mieteinnahmen/Mo</p>
                <p className="text-xl font-bold text-emerald-400"><Money value={calculations.totalMonthlyRent} privacy={privacy} fractionDigits={0} /></p>
              </div>
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <p className="text-emerald-300 text-sm">Marktwert gesamt</p>
                <p className="text-xl font-bold text-emerald-400"><Money value={calculations.totalMarketValue} privacy={privacy} fractionDigits={0} /></p>
              </div>
              <div className="p-4 bg-slate-800 rounded-lg">
                <p className="text-slate-400 text-sm">Andere Eigentümer ({calculations.otherUnits.length})</p>
                <p className="text-xl font-bold text-slate-400">{calculations.otherUnits.reduce((s, u) => s + u.size, 0)} m²</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 3. Finanzierung */}
      <Card>
        <SectionHeader id="financing" title="Finanzierung" icon={<PiggyBank size={16} className="text-white" />} color="bg-purple-500" />
        {expandedSections.financing && (
          <div className="mt-4 space-y-6">
            {/* Financing Sliders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Eigenkapital Slider */}
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-slate-300 font-medium">Eigenkapital</label>
                  <span className="text-xl font-bold text-purple-400">€{eigenkapital.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="500000"
                  step="10000"
                  value={eigenkapital}
                  onChange={(e) => setEigenkapital(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>€0</span>
                  <span>€500.000</span>
                </div>
              </div>

              {/* Zinssatz Slider */}
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-slate-300 font-medium">Zinssatz</label>
                  <span className="text-xl font-bold text-purple-400">{zinssatz.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="0.1"
                  value={zinssatz}
                  onChange={(e) => setZinssatz(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>1%</span>
                  <span>8%</span>
                </div>
              </div>

              {/* Tilgung Slider */}
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-slate-300 font-medium">Tilgung</label>
                  <span className="text-xl font-bold text-purple-400">{tilgung.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.1"
                  value={tilgung}
                  onChange={(e) => setTilgung(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>1%</span>
                  <span>5%</span>
                </div>
              </div>

              {/* Zinsbindung Slider */}
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-slate-300 font-medium">Zinsbindung</label>
                  <span className="text-xl font-bold text-purple-400">{zinsbindung} Jahre</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={zinsbindung}
                  onChange={(e) => setZinsbindung(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>5 J</span>
                  <span>30 J</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-800 rounded-lg">
                <p className="text-slate-400 text-sm">Kreditbetrag</p>
                <p className="text-xl font-bold text-amber-400"><Money value={calculations.kreditbetrag} privacy={privacy} fractionDigits={0} /></p>
              </div>
              <div className="p-4 bg-slate-800 rounded-lg">
                <p className="text-slate-400 text-sm">Monatliche Rate</p>
                <p className="text-xl font-bold text-white"><Money value={calculations.monthlyRate} privacy={privacy} fractionDigits={0} /></p>
              </div>
              <div className="p-4 bg-slate-800 rounded-lg">
                <p className="text-slate-400 text-sm">Jährliche Belastung</p>
                <p className="text-xl font-bold text-white"><Money value={calculations.yearlyRate} privacy={privacy} fractionDigits={0} /></p>
              </div>
              <div className="p-4 bg-slate-800 rounded-lg">
                <p className="text-slate-400 text-sm">Restschuld nach {zinsbindung}J</p>
                <p className="text-xl font-bold text-amber-400"><Money value={calculations.remainingDebt} privacy={privacy} fractionDigits={0} /></p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 4. Wirtschaftlichkeit */}
      <Card>
        <SectionHeader id="economics" title="Wirtschaftlichkeit" icon={<TrendingUp size={16} className="text-white" />} color="bg-emerald-500" />
        {expandedSections.economics && (
          <div className="mt-4 space-y-6">
            <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg">
              <span className="text-slate-400">Bewirtschaftungskosten:</span>
              <input
                type="range"
                min="15"
                max="35"
                step="1"
                value={bewirtschaftungskostenPercent}
                onChange={(e) => setBewirtschaftungskostenPercent(Number(e.target.value))}
                className="flex-1 accent-emerald-500"
              />
              <span className="text-emerald-400 font-medium w-16 text-right">{bewirtschaftungskostenPercent}%</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="p-4 bg-slate-800 rounded-lg text-center">
                <p className="text-slate-400 text-xs uppercase mb-1">Jahresmiete (brutto)</p>
                <p className="text-xl font-bold text-white"><Money value={calculations.yearlyRentGross} privacy={privacy} fractionDigits={0} /></p>
              </div>
              <div className="p-4 bg-slate-800 rounded-lg text-center">
                <p className="text-slate-400 text-xs uppercase mb-1">- Bewirtschaftung</p>
                <p className="text-xl font-bold text-red-400"><Money value={calculations.bewirtschaftungskosten} privacy={privacy} fractionDigits={0} /></p>
              </div>
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-center">
                <p className="text-emerald-300 text-xs uppercase mb-1">= NOI</p>
                <p className="text-xl font-bold text-emerald-400"><Money value={calculations.noi} privacy={privacy} fractionDigits={0} /></p>
              </div>
              <div className="p-4 bg-slate-800 rounded-lg text-center">
                <p className="text-slate-400 text-xs uppercase mb-1">- Kapitaldienst</p>
                <p className="text-xl font-bold text-red-400"><Money value={calculations.yearlyRate} privacy={privacy} fractionDigits={0} /></p>
              </div>
              <div className={`p-4 rounded-lg text-center ${calculations.cashflowBeforeTax >= 0 ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                <p className={`text-xs uppercase mb-1 ${calculations.cashflowBeforeTax >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>= Cashflow</p>
                <p className={`text-xl font-bold ${calculations.cashflowBeforeTax >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  <Money value={calculations.cashflowBeforeTax} privacy={privacy} fractionDigits={0} sign />
                </p>
              </div>
              <div className={`p-4 rounded-lg text-center ${calculations.dscr >= 1 ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                <p className="text-slate-400 text-xs uppercase mb-1">DSCR</p>
                <p className={`text-xl font-bold ${getDSCRColor(calculations.dscr)}`}>{calculations.dscr.toFixed(2)}</p>
                <p className="text-xs text-slate-500">{calculations.dscr >= 1.2 ? 'Sehr gut' : calculations.dscr >= 1 ? 'OK' : 'Kritisch'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-800 rounded-lg text-center">
                <p className="text-slate-400 text-xs uppercase mb-1">Bruttomietrendite</p>
                <p className={`text-xl font-bold ${calculations.bruttomietrendite >= 5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {calculations.bruttomietrendite.toFixed(2)}%
                </p>
              </div>
              <div className="p-4 bg-slate-800 rounded-lg text-center">
                <p className="text-slate-400 text-xs uppercase mb-1">Nettomietrendite</p>
                <p className={`text-xl font-bold ${calculations.nettomietrendite >= 3 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {calculations.nettomietrendite.toFixed(2)}%
                </p>
              </div>
              <div className="p-4 bg-slate-800 rounded-lg text-center">
                <p className="text-slate-400 text-xs uppercase mb-1">ROI auf Eigenkapital</p>
                <p className={`text-xl font-bold ${calculations.roiEquity >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {calculations.roiEquity.toFixed(1)}%
                </p>
              </div>
              <div className="p-4 bg-slate-800 rounded-lg text-center">
                <p className="text-slate-400 text-xs uppercase mb-1">Cashflow/Monat</p>
                <p className={`text-xl font-bold ${calculations.monthlyCashflow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  <Money value={calculations.monthlyCashflow} privacy={privacy} fractionDigits={0} sign />
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 5. Zeitplan */}
      <Card>
        <SectionHeader id="timeline" title="Zeitplan" icon={<Clock size={16} className="text-white" />} color="bg-teal-500" />
        {expandedSections.timeline && (
          <div className="mt-4 space-y-4">
            <div className="relative">
              {/* Timeline track */}
              <div className="absolute left-0 right-0 h-2 bg-slate-700 rounded-full top-1/2 -translate-y-1/2"></div>
              
              {/* Months labels */}
              <div className="flex justify-between text-xs text-slate-400 mb-8 px-2">
                {[-6, -3, 0, 3, 6, 9, 12].map(m => (
                  <span key={m}>{m >= 0 ? `M${m}` : `M${m}`}</span>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {timelinePhases.map(phase => {
                const totalMonths = 18; // -6 to 12
                const startPercent = ((phase.startMonth + 6) / totalMonths) * 100;
                const widthPercent = ((phase.endMonth - phase.startMonth) / totalMonths) * 100;

                return (
                  <div key={phase.id} className="flex items-center gap-4">
                    <div className="w-40 flex items-center gap-2 text-sm text-white">
                      <div className={`w-6 h-6 rounded ${phase.color} flex items-center justify-center`}>
                        {phase.icon}
                      </div>
                      <span className="truncate">{phase.name}</span>
                    </div>
                    <div className="flex-1 h-6 bg-slate-800 rounded-full relative overflow-hidden">
                      <div
                        className={`absolute h-full ${phase.color} rounded-full`}
                        style={{ left: `${startPercent}%`, width: `${widthPercent}%` }}
                      />
                    </div>
                    <div className="w-24 text-xs text-slate-400 text-right">
                      M{phase.startMonth} → M{phase.endMonth}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 p-4 bg-slate-800/50 rounded-lg">
              <h4 className="text-sm font-semibold text-white mb-2">Meilensteine</h4>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>• <strong>Monat -6 bis -3:</strong> Planung, Genehmigungen, Bankgespräche</li>
                <li>• <strong>Monat 0:</strong> Baustart, erster Kreditabruf</li>
                <li>• <strong>Monat 5-6:</strong> Start Vermarktung (Exposés, Portale)</li>
                <li>• <strong>Monat 9:</strong> Fertigstellung & Abnahme</li>
                <li>• <strong>Monat 10-12:</strong> Einzug Mieter, Vollvermietung</li>
                <li>• <strong>Ab Monat 12:</strong> Voller Kapitaldienst aus Mieteinnahmen</li>
              </ul>
            </div>
          </div>
        )}
      </Card>

      {/* 6. Risikoanalyse */}
      <Card>
        <SectionHeader id="risk" title="Risikoanalyse" icon={<AlertTriangle size={16} className="text-white" />} color="bg-red-500" />
        {expandedSections.risk && (
          <div className="mt-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Cost overrun */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm text-slate-400">Kostensteigerung</label>
                  <span className={`font-medium ${costOverrun > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    +{costOverrun}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="5"
                  value={costOverrun}
                  onChange={(e) => setCostOverrun(Number(e.target.value))}
                  className="w-full accent-red-500"
                />
                <p className="text-xs text-slate-500">
                  Neue Gesamtkosten: <Money value={calculations.totalCostsWithOverrun} privacy={privacy} fractionDigits={0} />
                </p>
              </div>

              {/* Vacancy */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm text-slate-400">Leerstand/Jahr</label>
                  <span className={`font-medium ${vacancyMonths > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {vacancyMonths} Monate
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="6"
                  step="1"
                  value={vacancyMonths}
                  onChange={(e) => setVacancyMonths(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <p className="text-xs text-slate-500">
                  Effektive Miete: <Money value={calculations.effectiveYearlyRent} privacy={privacy} fractionDigits={0} />/Jahr
                </p>
              </div>

              {/* Future interest */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm text-slate-400">Zinsanstieg nach {zinsbindung}J</label>
                  <span className={`font-medium ${futureInterestIncrease > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    +{futureInterestIncrease}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={futureInterestIncrease}
                  onChange={(e) => setFutureInterestIncrease(Number(e.target.value))}
                  className="w-full accent-red-500"
                />
                <p className="text-xs text-slate-500">
                  Neue Rate: <Money value={calculations.futureMonthlyRate} privacy={privacy} fractionDigits={0} />/Mo
                </p>
              </div>
            </div>

            {/* Risk Impact Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`p-4 rounded-lg text-center ${calculations.dscr >= 1.2 ? 'bg-emerald-500/10 border border-emerald-500/30' : calculations.dscr >= 1 ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                <p className="text-slate-400 text-xs uppercase mb-1">DSCR (mit Risiken)</p>
                <p className={`text-2xl font-bold ${getDSCRColor(calculations.dscr)}`}>{calculations.dscr.toFixed(2)}</p>
              </div>
              <div className={`p-4 rounded-lg text-center ${calculations.monthlyCashflow >= 0 ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                <p className="text-slate-400 text-xs uppercase mb-1">Cashflow (mit Risiken)</p>
                <p className={`text-2xl font-bold ${calculations.monthlyCashflow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  <Money value={calculations.monthlyCashflow} privacy={privacy} fractionDigits={0} sign />
                </p>
              </div>
              <div className="p-4 bg-slate-800 rounded-lg text-center">
                <p className="text-slate-400 text-xs uppercase mb-1">Neuer Kreditbedarf</p>
                <p className="text-2xl font-bold text-amber-400"><Money value={calculations.kreditbetrag} privacy={privacy} fractionDigits={0} /></p>
              </div>
              <div className="p-4 bg-slate-800 rounded-lg text-center">
                <p className="text-slate-400 text-xs uppercase mb-1">Puffer benötigt</p>
                <p className="text-2xl font-bold text-white"><Money value={Math.max(0, -calculations.monthlyCashflow * 12)} privacy={privacy} fractionDigits={0} /></p>
              </div>
            </div>

            {/* Risk Warnings */}
            <div className="space-y-2">
              {calculations.dscr < 1 && (
                <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
                  <AlertTriangle size={18} />
                  <span><strong>DSCR unter 1.0:</strong> Mieteinnahmen decken nicht den Kapitaldienst. Liquiditätspuffer erforderlich!</span>
                </div>
              )}
              {calculations.dscr >= 1 && calculations.dscr < 1.2 && (
                <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-sm">
                  <AlertTriangle size={18} />
                  <span><strong>DSCR unter 1.2:</strong> Knapper Puffer. Bank könnte zusätzliche Sicherheiten verlangen.</span>
                </div>
              )}
              {costOverrun > 15 && (
                <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-sm">
                  <AlertTriangle size={18} />
                  <span><strong>Kostensteigerung {">"} 15%:</strong> Erhöhter Finanzierungsbedarf. Nachfinanzierung prüfen.</span>
                </div>
              )}
              {calculations.dscr >= 1.2 && costOverrun <= 15 && vacancyMonths <= 2 && (
                <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-sm">
                  <CheckCircle2 size={18} />
                  <span><strong>Gute Konstellation:</strong> Projekt erscheint wirtschaftlich tragfähig.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Info Box */}
      <Card className="bg-slate-800/50 border border-slate-700">
        <h4 className="text-sm font-semibold text-white mb-2">Hinweise zum Businessplan</h4>
        <ul className="text-xs text-slate-400 space-y-1">
          <li>• <strong>DSCR (Debt Service Coverage Ratio):</strong> NOI / Kapitaldienst. {">"} 1.2 gilt als solide, {">"} 1.0 als tragfähig.</li>
          <li>• <strong>Bewirtschaftungskosten:</strong> Typisch 20-30% der Mieteinnahmen (Verwaltung, Instandhaltung, Rücklagen, Leerstandsrisiko).</li>
          <li>• <strong>NOI (Net Operating Income):</strong> Mieteinnahmen abzüglich laufender Bewirtschaftungskosten, vor Kapitaldienst.</li>
          <li>• <strong>Nebenkosten:</strong> 10-15% der Baukosten für Architekt, Statik, Genehmigungen, Notar, Anschlüsse etc.</li>
          <li>• Dieser Businessplan dient als Planungshilfe. Für Bankgespräche individuell anpassen und durch Fachleute prüfen lassen.</li>
        </ul>
      </Card>
    </div>
  );
};

// ===================== BUSINESS PLAN DOCUMENT =====================

const BusinessPlanDocument: React.FC<{ privacy: boolean }> = ({ privacy }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [planData, setPlanData] = useState<BusinessPlanData | null>(null);
  const documentRef = React.useRef<HTMLDivElement>(null);

  // Load business plan data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const plans = await StorageService.getBusinessPlans();
        const savedPlan = plans.find(p => p.id === BUSINESS_PLAN_ID);
        if (savedPlan) {
          setPlanData(savedPlan);
        }
      } catch (e) {
        console.error("Failed to load business plan:", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Calculate derived values
  const calculations = useMemo(() => {
    if (!planData) return null;

    const baseCosts = planData.costs.reduce((sum, c) => sum + c.amount, 0);
    const nebenkosten = planData.nebenkostenItems.reduce((sum, n) => sum + n.amount, 0);
    const totalCosts = baseCosts + nebenkosten - planData.baukostenzuschuss;
    const pricePerSqm = planData.pricePerSqm || 5500;

    const ownedUnits = planData.units.filter(u => u.isOwned);
    const totalSize = ownedUnits.reduce((sum, u) => sum + u.size, 0);
    const totalMonthlyRent = ownedUnits.reduce((sum, u) => sum + u.monthlyRent, 0);
    const totalMarketValue = ownedUnits.reduce((sum, u) => sum + u.size * pricePerSqm, 0);
    const yearlyRent = totalMonthlyRent * 12;

    const kreditbetrag = Math.max(0, totalCosts - planData.eigenkapital);
    const annualRate = (planData.zinssatz + planData.tilgung) / 100;
    const monthlyRate = kreditbetrag * annualRate / 12;
    const yearlyRate = monthlyRate * 12;

    const bewirtschaftungskosten = yearlyRent * (planData.bewirtschaftungskostenPercent / 100);
    const noi = yearlyRent - bewirtschaftungskosten;
    const dscr = yearlyRate > 0 ? noi / yearlyRate : 0;
    const cashflowBeforeTax = noi - yearlyRate;

    const bruttomietrendite = totalMarketValue > 0 ? (yearlyRent / totalMarketValue) * 100 : 0;
    const nettomietrendite = totalMarketValue > 0 ? (noi / totalMarketValue) * 100 : 0;
    const roiEquity = planData.eigenkapital > 0 ? (cashflowBeforeTax / planData.eigenkapital) * 100 : 0;

    return {
      baseCosts,
      nebenkosten,
      totalCosts,
      pricePerSqm,
      ownedUnits,
      totalSize,
      totalMonthlyRent,
      totalMarketValue,
      yearlyRent,
      kreditbetrag,
      monthlyRate,
      yearlyRate,
      bewirtschaftungskosten,
      noi,
      dscr,
      cashflowBeforeTax,
      bruttomietrendite,
      nettomietrendite,
      roiEquity,
    };
  }, [planData]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="ml-3 text-slate-400">Lade Businessplan-Daten...</span>
      </div>
    );
  }

  if (!planData || !calculations) {
    return (
      <Card className="text-center py-12">
        <FileText size={48} className="mx-auto text-slate-600 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Kein Businessplan vorhanden</h3>
        <p className="text-slate-400">Erstellen Sie zuerst einen Businessplan im "Businessplan" Tab.</p>
      </Card>
    );
  }

  const formatCurrency = (val: number) => privacy ? '****' : `€${val.toLocaleString('de-DE', { maximumFractionDigits: 0 })}`;
  const formatPercent = (val: number) => `${val.toFixed(1)}%`;
  const today = new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Header with PDF Button */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
            <FileText size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Businessplan Dokument</h2>
            <p className="text-slate-400 text-sm">Professioneller Businessplan zum Download</p>
          </div>
        </div>
        <Button onClick={handlePrint} className="bg-teal-600 hover:bg-teal-700">
          <FileText size={18} /> PDF herunterladen
        </Button>
      </div>

      {/* Printable Document */}
      <div ref={documentRef} className="bg-white text-slate-900 rounded-xl p-8 print:p-0 print:bg-white print:text-black">
        {/* Document Header */}
        <div className="border-b-2 border-slate-200 pb-6 mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Businessplan</h1>
          <h2 className="text-xl text-slate-600 mb-4">Neubau Mehrfamilienhaus mit Vermietung</h2>
          <p className="text-sm text-slate-500">Erstellt am: {today}</p>
        </div>

        {/* Executive Summary */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">1. Executive Summary</h2>
          <div className="prose prose-slate max-w-none">
            <p className="mb-4">
              Das vorliegende Projekt umfasst den Neubau eines Mehrfamilienhauses mit <strong>{planData.units.length} Wohneinheiten</strong> 
              und einer Gesamtwohnfläche von <strong>{planData.units.reduce((s, u) => s + u.size, 0)} m²</strong>. 
              Von diesen Einheiten sind <strong>{calculations.ownedUnits.length} Wohnungen</strong> ({calculations.totalSize} m²) zur Vermietung bestimmt.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6 not-prose">
              <div className="bg-slate-100 p-4 rounded-lg">
                <p className="text-xs text-slate-500 uppercase">Investitionsvolumen</p>
                <p className="text-lg font-bold text-slate-900">{formatCurrency(calculations.totalCosts)}</p>
              </div>
              <div className="bg-slate-100 p-4 rounded-lg">
                <p className="text-xs text-slate-500 uppercase">Eigenkapital</p>
                <p className="text-lg font-bold text-slate-900">{formatCurrency(planData.eigenkapital)}</p>
              </div>
              <div className="bg-slate-100 p-4 rounded-lg">
                <p className="text-xs text-slate-500 uppercase">Fremdkapital</p>
                <p className="text-lg font-bold text-slate-900">{formatCurrency(calculations.kreditbetrag)}</p>
              </div>
              <div className="bg-slate-100 p-4 rounded-lg">
                <p className="text-xs text-slate-500 uppercase">Geschätzter Marktwert</p>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(calculations.totalMarketValue)}</p>
              </div>
            </div>
            <p>
              Die geplanten jährlichen Mieteinnahmen belaufen sich auf <strong>{formatCurrency(calculations.yearlyRent)}</strong> 
              ({formatCurrency(calculations.totalMonthlyRent)}/Monat). Der Debt Service Coverage Ratio (DSCR) beträgt 
              <strong className={calculations.dscr >= 1.2 ? ' text-emerald-600' : calculations.dscr >= 1 ? ' text-amber-600' : ' text-red-600'}> {calculations.dscr.toFixed(2)}</strong>, 
              was {calculations.dscr >= 1.2 ? 'eine komfortable Absicherung' : calculations.dscr >= 1 ? 'eine ausreichende Deckung' : 'ein erhöhtes Risiko'} darstellt.
            </p>
          </div>
        </section>

        {/* Projektbeschreibung */}
        <section className="mb-8 page-break-inside-avoid">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">2. Projektbeschreibung</h2>
          <div className="prose prose-slate max-w-none">
            <h3 className="text-lg font-semibold mb-2">2.1 Baukosten</h3>
            <table className="w-full text-sm mb-4">
              <thead className="bg-slate-100">
                <tr><th className="text-left p-2">Position</th><th className="text-right p-2">Betrag</th></tr>
              </thead>
              <tbody>
                {planData.costs.map(c => (
                  <tr key={c.id} className="border-b border-slate-200">
                    <td className="p-2">{c.name}</td>
                    <td className="text-right p-2">{formatCurrency(c.amount)}</td>
                  </tr>
                ))}
                <tr className="font-semibold bg-slate-50">
                  <td className="p-2">Zwischensumme Baukosten</td>
                  <td className="text-right p-2">{formatCurrency(calculations.baseCosts)}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-2">Nebenkosten (Architekt, Notar, etc.)</td>
                  <td className="text-right p-2">{formatCurrency(calculations.nebenkosten)}</td>
                </tr>
                {planData.baukostenzuschuss > 0 && (
                  <tr className="border-b border-slate-200 text-emerald-600">
                    <td className="p-2">Baukostenzuschuss (Förderung)</td>
                    <td className="text-right p-2">-{formatCurrency(planData.baukostenzuschuss)}</td>
                  </tr>
                )}
                <tr className="font-bold bg-slate-100">
                  <td className="p-2">Gesamtinvestition</td>
                  <td className="text-right p-2">{formatCurrency(calculations.totalCosts)}</td>
                </tr>
              </tbody>
            </table>

            <h3 className="text-lg font-semibold mb-2">2.2 Wohneinheiten</h3>
            <table className="w-full text-sm mb-4">
              <thead className="bg-slate-100">
                <tr>
                  <th className="text-left p-2">Einheit</th>
                  <th className="text-right p-2">Größe</th>
                  <th className="text-right p-2">Miete/Mo</th>
                  <th className="text-right p-2">Marktwert</th>
                  <th className="text-center p-2">Eigentum</th>
                </tr>
              </thead>
              <tbody>
                {planData.units.map(u => (
                  <tr key={u.id} className="border-b border-slate-200">
                    <td className="p-2">{u.name}</td>
                    <td className="text-right p-2">{u.size} m²</td>
                    <td className="text-right p-2">{formatCurrency(u.monthlyRent)}</td>
                    <td className="text-right p-2">{formatCurrency(u.size * calculations.pricePerSqm)}</td>
                    <td className="text-center p-2">{u.isOwned ? '✓ Investor' : '— Andere'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-sm text-slate-600">
              Berechnungsgrundlage Marktwert: {formatCurrency(calculations.pricePerSqm)}/m²
            </p>
          </div>
        </section>

        {/* Finanzierung */}
        <section className="mb-8 page-break-inside-avoid">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">3. Finanzierung</h2>
          <div className="prose prose-slate max-w-none">
            <div className="grid grid-cols-2 gap-6 mb-4 not-prose">
              <div>
                <h3 className="text-lg font-semibold mb-2">Kapitalstruktur</h3>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b"><td className="p-2">Eigenkapital</td><td className="text-right p-2 font-medium">{formatCurrency(planData.eigenkapital)}</td></tr>
                    <tr className="border-b"><td className="p-2">Fremdkapital</td><td className="text-right p-2 font-medium">{formatCurrency(calculations.kreditbetrag)}</td></tr>
                    <tr className="bg-slate-50 font-semibold"><td className="p-2">Gesamt</td><td className="text-right p-2">{formatCurrency(calculations.totalCosts)}</td></tr>
                  </tbody>
                </table>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Kreditkonditionen</h3>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b"><td className="p-2">Zinssatz</td><td className="text-right p-2 font-medium">{formatPercent(planData.zinssatz)}</td></tr>
                    <tr className="border-b"><td className="p-2">Tilgung</td><td className="text-right p-2 font-medium">{formatPercent(planData.tilgung)}</td></tr>
                    <tr className="border-b"><td className="p-2">Zinsbindung</td><td className="text-right p-2 font-medium">{planData.zinsbindung} Jahre</td></tr>
                    <tr className="bg-slate-50 font-semibold"><td className="p-2">Monatliche Rate</td><td className="text-right p-2">{formatCurrency(calculations.monthlyRate)}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* Wirtschaftlichkeit */}
        <section className="mb-8 page-break-inside-avoid">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">4. Wirtschaftlichkeitsberechnung</h2>
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Einnahmen & Ausgaben (p.a.)</h3>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b"><td className="p-2">Mieteinnahmen (brutto)</td><td className="text-right p-2 text-emerald-600 font-medium">+{formatCurrency(calculations.yearlyRent)}</td></tr>
                  <tr className="border-b"><td className="p-2">Bewirtschaftungskosten ({planData.bewirtschaftungskostenPercent}%)</td><td className="text-right p-2 text-red-600">-{formatCurrency(calculations.bewirtschaftungskosten)}</td></tr>
                  <tr className="bg-slate-50 font-semibold"><td className="p-2">NOI (Net Operating Income)</td><td className="text-right p-2">{formatCurrency(calculations.noi)}</td></tr>
                  <tr className="border-b"><td className="p-2">Kapitaldienst</td><td className="text-right p-2 text-red-600">-{formatCurrency(calculations.yearlyRate)}</td></tr>
                  <tr className={`font-bold ${calculations.cashflowBeforeTax >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    <td className="p-2">Cashflow vor Steuern</td>
                    <td className={`text-right p-2 ${calculations.cashflowBeforeTax >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(calculations.cashflowBeforeTax)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Kennzahlen</h3>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b"><td className="p-2">Bruttomietrendite</td><td className="text-right p-2 font-medium">{formatPercent(calculations.bruttomietrendite)}</td></tr>
                  <tr className="border-b"><td className="p-2">Nettomietrendite</td><td className="text-right p-2 font-medium">{formatPercent(calculations.nettomietrendite)}</td></tr>
                  <tr className="border-b"><td className="p-2">Eigenkapitalrendite</td><td className="text-right p-2 font-medium">{formatPercent(calculations.roiEquity)}</td></tr>
                  <tr className={`font-semibold ${calculations.dscr >= 1.2 ? 'bg-emerald-50' : calculations.dscr >= 1 ? 'bg-amber-50' : 'bg-red-50'}`}>
                    <td className="p-2">DSCR</td>
                    <td className={`text-right p-2 ${calculations.dscr >= 1.2 ? 'text-emerald-600' : calculations.dscr >= 1 ? 'text-amber-600' : 'text-red-600'}`}>{calculations.dscr.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Risikoanalyse */}
        <section className="mb-8 page-break-inside-avoid">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">5. Risikoanalyse</h2>
          <div className="prose prose-slate max-w-none">
            <ul className="space-y-2">
              <li><strong>Baurisiken:</strong> Kostensteigerungen während der Bauphase (aktuell {planData.costOverrun}% eingeplant). Absicherung durch Festpreisverträge und Puffer empfohlen.</li>
              <li><strong>Vermietungsrisiko:</strong> Leerstand kann zu Einnahmeausfällen führen (aktuell {planData.vacancyMonths} Monate/Jahr kalkuliert). Vermarktung vor Fertigstellung beginnen.</li>
              <li><strong>Zinsänderungsrisiko:</strong> Nach Ablauf der {planData.zinsbindung}-jährigen Zinsbindung können Zinsen steigen (aktuell +{planData.futureInterestIncrease}% eingeplant).</li>
              <li><strong>DSCR-Bewertung:</strong> {calculations.dscr >= 1.2 ? 'Komfortable Absicherung mit ausreichend Puffer.' : calculations.dscr >= 1 ? 'Deckung gegeben, aber geringer Puffer.' : 'Kritisch! Liquiditätsreserven zwingend erforderlich.'}</li>
            </ul>
          </div>
        </section>

        {/* Fazit */}
        <section className="mb-8 page-break-inside-avoid">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">6. Fazit</h2>
          <div className="prose prose-slate max-w-none">
            <p>
              Das Projekt bietet eine Investitionsmöglichkeit mit einem geschätzten Marktwert von <strong>{formatCurrency(calculations.totalMarketValue)}</strong> 
              bei einer Gesamtinvestition von {formatCurrency(calculations.totalCosts)}. 
              {calculations.totalMarketValue > calculations.totalCosts && (
                <span> Dies entspricht einer potenziellen Wertsteigerung von <strong>{formatCurrency(calculations.totalMarketValue - calculations.totalCosts)}</strong> ({formatPercent((calculations.totalMarketValue - calculations.totalCosts) / calculations.totalCosts * 100)}).</span>
              )}
            </p>
            <p>
              Mit einem {calculations.cashflowBeforeTax >= 0 ? 'positiven' : 'negativen'} jährlichen Cashflow von {formatCurrency(Math.abs(calculations.cashflowBeforeTax))} 
              und einem DSCR von {calculations.dscr.toFixed(2)} {calculations.dscr >= 1.2 ? 'ist das Projekt gut abgesichert' : calculations.dscr >= 1 ? 'deckt das Projekt seine laufenden Kosten' : 'erfordert das Projekt zusätzliche Liquiditätsreserven'}.
            </p>
            <p className="text-sm text-slate-500 mt-6">
              Hinweis: Dieser Businessplan dient als Planungshilfe und ersetzt keine professionelle Beratung. 
              Für Finanzierungsgespräche mit Banken sollte dieser Plan individuell angepasst und durch Fachleute geprüft werden.
            </p>
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-4 mt-8 text-center text-xs text-slate-500">
          <p>Erstellt mit FinanceCS • {today}</p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          [class*="bg-white"] {
            visibility: visible;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          [class*="bg-white"] * {
            visibility: visible;
          }
          .page-break-inside-avoid {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
};

// ===================== PROJEKTPLAN 5-WOHNUNGEN SIMULATOR =====================

interface WohneinheitConfig {
  id: string;
  name: string;
  size: number;
  isPenthouse: boolean;
  owner: 'tini' | 'user';
}

const DEFAULT_WOHNUNGEN: WohneinheitConfig[] = [
  { id: '1', name: 'Wohnung 1 (EG)', size: 88, isPenthouse: false, owner: 'tini' },
  { id: '2', name: 'Wohnung 2 (1.OG)', size: 88, isPenthouse: false, owner: 'tini' },
  { id: '3', name: 'Wohnung 3 (1.OG)', size: 88, isPenthouse: false, owner: 'user' },
  { id: '4', name: 'Wohnung 4 (2.OG)', size: 88, isPenthouse: false, owner: 'user' },
  { id: '5', name: 'Penthouse (DG)', size: 120, isPenthouse: true, owner: 'user' },
];

const ProjektplanSimulatorLegacy: React.FC<{ privacy: boolean }> = ({ privacy }) => {
  // Finanzierung
  const [baukredit, setBaukredit] = useState(750000);
  const [zinssatz, setZinssatz] = useState(2.2);
  const [tilgung, setTilgung] = useState(2.0);
  const [zinsbindung, setZinsbindung] = useState(10);
  const [eigenkapital, setEigenkapital] = useState(200000);
  const [kfwDarlehen, setKfwDarlehen] = useState(100000);
  const [kfwZins, setKfwZins] = useState(1.5);

  // Baukosten
  const [fertighausRohbau, setFertighausRohbau] = useState(440000);
  const [kellerbau, setKellerbau] = useState(150000);
  const [abrisskosten, setAbrisskosten] = useState(25000);
  const [nebenkostenPercent, setNebenkostenPercent] = useState(12);
  const [innenausbau, setInnenausbau] = useState(80000);

  // Mieteinnahmen
  const [preisProQm, setPreisProQm] = useState(5500);
  const [mieteProQm, setMieteProQm] = useState(17);
  const [penthouseAufpreis, setPenthouseAufpreis] = useState(20);

  // Langfristplanung
  const [haltedauer, setHaltedauer] = useState(10);
  const [wertsteigerung, setWertsteigerung] = useState(2.0);
  const [mietsteigerung, setMietsteigerung] = useState(1.5);

  // Wohneinheiten
  const [wohnungen, setWohnungen] = useState<WohneinheitConfig[]>(DEFAULT_WOHNUNGEN);

  // Expanded sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    finanzierung: true,
    baukosten: true,
    einnahmen: true,
    langfrist: false,
    wohnungen: false,
  });

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Calculate everything
  const calculations = useMemo(() => {
    // Baukosten
    const baukostenBasis = fertighausRohbau + kellerbau + abrisskosten + innenausbau;
    const nebenkosten = baukostenBasis * (nebenkostenPercent / 100);
    const gesamtbaukosten = baukostenBasis + nebenkosten;

    // Finanzierung
    const gesamtFinanzierung = baukredit + kfwDarlehen;
    const finanzierungslücke = gesamtbaukosten - eigenkapital - gesamtFinanzierung;
    const gewichteterZins = gesamtFinanzierung > 0
      ? (baukredit * zinssatz + kfwDarlehen * kfwZins) / gesamtFinanzierung
      : zinssatz;
    
    const annuität = (gewichteterZins + tilgung) / 100;
    const monatlicheRate = gesamtFinanzierung * annuität / 12;
    const jährlicheRate = monatlicheRate * 12;

    // Wohnungen & Eigentum
    const userWohnungen = wohnungen.filter(w => w.owner === 'user');
    const tiniWohnungen = wohnungen.filter(w => w.owner === 'tini');
    const userQm = userWohnungen.reduce((sum, w) => sum + w.size, 0);
    const tiniQm = tiniWohnungen.reduce((sum, w) => sum + w.size, 0);
    const gesamtQm = userQm + tiniQm;

    // Marktwert & Mieteinnahmen (nur für User-Wohnungen)
    let userMarktwert = 0;
    let userMonatsMiete = 0;
    userWohnungen.forEach(w => {
      const aufpreis = w.isPenthouse ? (1 + penthouseAufpreis / 100) : 1;
      userMarktwert += w.size * preisProQm * aufpreis;
      userMonatsMiete += w.size * mieteProQm * aufpreis;
    });
    const userJahresMiete = userMonatsMiete * 12;

    // Tinis Wohnungen (für Partner-Übersicht)
    let tiniMarktwert = 0;
    tiniWohnungen.forEach(w => {
      const aufpreis = w.isPenthouse ? (1 + penthouseAufpreis / 100) : 1;
      tiniMarktwert += w.size * preisProQm * aufpreis;
    });

    // Wirtschaftlichkeit
    const bewirtschaftung = userJahresMiete * 0.25; // 25% pauschal
    const noi = userJahresMiete - bewirtschaftung;
    const dscr = jährlicheRate > 0 ? noi / jährlicheRate : 0;
    const cashflowVorSteuer = noi - jährlicheRate;
    const monatlichCashflow = cashflowVorSteuer / 12;

    // Renditen
    const bruttomietrendite = userMarktwert > 0 ? (userJahresMiete / userMarktwert) * 100 : 0;
    const nettomietrendite = userMarktwert > 0 ? (noi / userMarktwert) * 100 : 0;
    const eigenkapitalrendite = eigenkapital > 0 ? (cashflowVorSteuer / eigenkapital) * 100 : 0;

    // Restschuld nach X Jahren
    let restschuld = gesamtFinanzierung;
    for (let i = 0; i < zinsbindung; i++) {
      const jahresZins = restschuld * (gewichteterZins / 100);
      const jahresTilgung = jährlicheRate - jahresZins;
      restschuld = Math.max(0, restschuld - jahresTilgung);
    }

    // Vermögensentwicklung über Haltedauer
    const projectionData = [];
    let currentMarktWert = userMarktwert;
    let currentMiete = userJahresMiete;
    let currentSchuld = gesamtFinanzierung;
    let kumulierteCashflows = 0;

    for (let jahr = 0; jahr <= haltedauer; jahr++) {
      const equity = currentMarktWert - currentSchuld;
      projectionData.push({
        jahr,
        marktwert: Math.round(currentMarktWert),
        schulden: Math.round(currentSchuld),
        eigenkapital: Math.round(equity),
        miete: Math.round(currentMiete),
        kumuliert: Math.round(kumulierteCashflows),
      });

      // Für nächstes Jahr
      if (jahr < haltedauer) {
        currentMarktWert *= (1 + wertsteigerung / 100);
        currentMiete *= (1 + mietsteigerung / 100);
        const currentNoi = currentMiete * 0.75; // 25% Bewirtschaftung
        const cf = currentNoi - jährlicheRate;
        kumulierteCashflows += cf;
        
        const jahresZins = currentSchuld * (gewichteterZins / 100);
        const jahresTilgung = Math.min(currentSchuld, jährlicheRate - jahresZins);
        currentSchuld = Math.max(0, currentSchuld - jahresTilgung);
      }
    }

    // Steuervorteil (AfA 2% auf Gebäude, 80% der Baukosten)
    const afaBasis = gesamtbaukosten * 0.8;
    const afaJährlich = afaBasis * 0.02;
    const steuerersparnis = afaJährlich * 0.42; // 42% Grenzsteuersatz angenommen

    return {
      // Baukosten
      baukostenBasis,
      nebenkosten,
      gesamtbaukosten,
      // Finanzierung
      gesamtFinanzierung,
      finanzierungslücke,
      gewichteterZins,
      monatlicheRate,
      jährlicheRate,
      restschuld,
      // Wohnungen
      userWohnungen,
      tiniWohnungen,
      userQm,
      tiniQm,
      gesamtQm,
      userMarktwert,
      tiniMarktwert,
      userMonatsMiete,
      userJahresMiete,
      // Wirtschaftlichkeit
      bewirtschaftung,
      noi,
      dscr,
      cashflowVorSteuer,
      monatlichCashflow,
      bruttomietrendite,
      nettomietrendite,
      eigenkapitalrendite,
      // Projektion
      projectionData,
      afaJährlich,
      steuerersparnis,
    };
  }, [baukredit, zinssatz, tilgung, zinsbindung, eigenkapital, kfwDarlehen, kfwZins,
      fertighausRohbau, kellerbau, abrisskosten, nebenkostenPercent, innenausbau,
      preisProQm, mieteProQm, penthouseAufpreis, haltedauer, wertsteigerung, mietsteigerung, wohnungen]);

  const formatCurrency = (val: number) => privacy ? '****' : `€${val.toLocaleString('de-DE', { maximumFractionDigits: 0 })}`;

  // Slider component for consistent styling
  const SliderRow: React.FC<{
    label: string;
    value: number;
    onChange: (val: number) => void;
    min: number;
    max: number;
    step: number;
    format: (val: number) => string;
    color?: string;
  }> = ({ label, value, onChange, min, max, step, format, color = 'cyan' }) => (
    <div className="p-3 bg-slate-800/50 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <span className="text-slate-300 text-sm">{label}</span>
        <span className={`font-bold text-${color}-400`}>{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-${color}-500`}
      />
      <div className="flex justify-between text-xs text-slate-500 mt-1">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );

  // Section header component
  const SectionHeader: React.FC<{ id: string; title: string; icon: React.ReactNode; color: string }> = ({ id, title, icon, color }) => (
    <button
      onClick={() => toggleSection(id)}
      className={`w-full flex items-center justify-between p-3 ${color} rounded-lg transition-all`}
    >
      <div className="flex items-center gap-2 text-white font-semibold">
        {icon}
        {title}
      </div>
      {expandedSections[id] ? <ChevronUp size={18} className="text-white" /> : <ChevronDown size={18} className="text-white" />}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
          <Building2 size={24} className="text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Projektplan: 5-Wohnungen-Neubau</h2>
          <p className="text-slate-400 text-sm">Interaktive Simulation des Bauprojekts mit Partnerin Tini</p>
        </div>
      </div>

      {/* Executive Summary */}
      <Card className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border-cyan-500/30">
        <h3 className="text-lg font-bold text-white mb-4">Projektübersicht</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="text-center">
            <p className="text-slate-400 text-xs uppercase mb-1">Gesamtbaukosten</p>
            <p className="text-xl font-bold text-white">{formatCurrency(calculations.gesamtbaukosten)}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-400 text-xs uppercase mb-1">Dein Marktwert</p>
            <p className="text-xl font-bold text-emerald-400">{formatCurrency(calculations.userMarktwert)}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-400 text-xs uppercase mb-1">Miete/Monat</p>
            <p className="text-xl font-bold text-blue-400">{formatCurrency(calculations.userMonatsMiete)}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-400 text-xs uppercase mb-1">Monatl. Rate</p>
            <p className="text-xl font-bold text-amber-400">{formatCurrency(calculations.monatlicheRate)}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-400 text-xs uppercase mb-1">Cashflow/Mo</p>
            <p className={`text-xl font-bold ${calculations.monatlichCashflow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(calculations.monatlichCashflow)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-slate-400 text-xs uppercase mb-1">DSCR</p>
            <p className={`text-xl font-bold ${calculations.dscr >= 1.2 ? 'text-emerald-400' : calculations.dscr >= 1 ? 'text-amber-400' : 'text-red-400'}`}>
              {calculations.dscr.toFixed(2)}
            </p>
          </div>
        </div>
      </Card>

      {/* Partner Split */}
      <Card>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Users size={20} className="text-cyan-400" /> Eigentumsverteilung
        </h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="p-4 bg-gradient-to-br from-cyan-900/30 to-cyan-800/20 rounded-xl border border-cyan-500/30">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-sm">DU</div>
              <div>
                <p className="text-white font-semibold">Deine Wohnungen</p>
                <p className="text-cyan-300 text-sm">{calculations.userWohnungen.length} Einheiten • {calculations.userQm} m²</p>
              </div>
            </div>
            <div className="space-y-2">
              {calculations.userWohnungen.map(w => (
                <div key={w.id} className="flex justify-between text-sm">
                  <span className="text-slate-300">{w.name}</span>
                  <span className="text-cyan-400">{w.size} m²</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-cyan-500/30">
              <div className="flex justify-between">
                <span className="text-slate-400">Marktwert</span>
                <span className="text-cyan-400 font-bold">{formatCurrency(calculations.userMarktwert)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-slate-400">Miete/Monat</span>
                <span className="text-emerald-400 font-bold">{formatCurrency(calculations.userMonatsMiete)}</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-xl border border-purple-500/30">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-sm">T</div>
              <div>
                <p className="text-white font-semibold">Tinis Wohnungen</p>
                <p className="text-purple-300 text-sm">{calculations.tiniWohnungen.length} Einheiten • {calculations.tiniQm} m²</p>
              </div>
            </div>
            <div className="space-y-2">
              {calculations.tiniWohnungen.map(w => (
                <div key={w.id} className="flex justify-between text-sm">
                  <span className="text-slate-300">{w.name}</span>
                  <span className="text-purple-400">{w.size} m²</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-purple-500/30">
              <div className="flex justify-between">
                <span className="text-slate-400">Marktwert</span>
                <span className="text-purple-400 font-bold">{formatCurrency(calculations.tiniMarktwert)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-slate-400">Einbringung</span>
                <span className="text-purple-400">Grundstück</span>
              </div>
            </div>
          </div>
        </div>

        {/* Visual bar */}
        <div className="mt-4">
          <div className="flex h-4 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-cyan-500 to-cyan-600 transition-all"
              style={{ width: `${(calculations.userQm / calculations.gesamtQm) * 100}%` }}
            />
            <div 
              className="bg-gradient-to-r from-purple-500 to-purple-600 transition-all"
              style={{ width: `${(calculations.tiniQm / calculations.gesamtQm) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>Du: {((calculations.userQm / calculations.gesamtQm) * 100).toFixed(0)}%</span>
            <span>Tini: {((calculations.tiniQm / calculations.gesamtQm) * 100).toFixed(0)}%</span>
          </div>
        </div>
      </Card>

      {/* 1. Finanzierung */}
      <Card>
        <SectionHeader id="finanzierung" title="Finanzierung" icon={<PiggyBank size={18} />} color="bg-gradient-to-r from-cyan-600 to-cyan-700" />
        {expandedSections.finanzierung && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SliderRow label="Baukredit" value={baukredit} onChange={setBaukredit} min={500000} max={1000000} step={10000} format={v => `€${(v/1000).toFixed(0)}k`} />
            <SliderRow label="KfW-Darlehen" value={kfwDarlehen} onChange={setKfwDarlehen} min={0} max={150000} step={10000} format={v => `€${(v/1000).toFixed(0)}k`} color="green" />
            <SliderRow label="Eigenkapital (Schenkung)" value={eigenkapital} onChange={setEigenkapital} min={50000} max={300000} step={10000} format={v => `€${(v/1000).toFixed(0)}k`} color="emerald" />
            <SliderRow label="Zinssatz Baukredit" value={zinssatz} onChange={setZinssatz} min={1.5} max={5} step={0.1} format={v => `${v.toFixed(1)}%`} color="amber" />
            <SliderRow label="Zinssatz KfW" value={kfwZins} onChange={setKfwZins} min={0.5} max={3} step={0.1} format={v => `${v.toFixed(1)}%`} color="green" />
            <SliderRow label="Anfängliche Tilgung" value={tilgung} onChange={setTilgung} min={1} max={4} step={0.1} format={v => `${v.toFixed(1)}%`} />
            <SliderRow label="Zinsbindung" value={zinsbindung} onChange={setZinsbindung} min={5} max={20} step={1} format={v => `${v} Jahre`} />
          </div>
        )}
        {expandedSections.finanzierung && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-800 rounded-lg text-center">
              <p className="text-slate-400 text-xs">Gesamtfinanzierung</p>
              <p className="text-lg font-bold text-white">{formatCurrency(calculations.gesamtFinanzierung)}</p>
            </div>
            <div className="p-3 bg-slate-800 rounded-lg text-center">
              <p className="text-slate-400 text-xs">Gewichteter Zins</p>
              <p className="text-lg font-bold text-amber-400">{calculations.gewichteterZins.toFixed(2)}%</p>
            </div>
            <div className="p-3 bg-slate-800 rounded-lg text-center">
              <p className="text-slate-400 text-xs">Monatliche Rate</p>
              <p className="text-lg font-bold text-white">{formatCurrency(calculations.monatlicheRate)}</p>
            </div>
            <div className="p-3 bg-slate-800 rounded-lg text-center">
              <p className="text-slate-400 text-xs">Restschuld nach {zinsbindung}J</p>
              <p className="text-lg font-bold text-amber-400">{formatCurrency(calculations.restschuld)}</p>
            </div>
          </div>
        )}
      </Card>

      {/* 2. Baukosten */}
      <Card>
        <SectionHeader id="baukosten" title="Baukosten" icon={<HardHat size={18} />} color="bg-gradient-to-r from-amber-600 to-orange-600" />
        {expandedSections.baukosten && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SliderRow label="Fertighaus Rohbau" value={fertighausRohbau} onChange={setFertighausRohbau} min={350000} max={550000} step={10000} format={v => `€${(v/1000).toFixed(0)}k`} color="amber" />
            <SliderRow label="Kellerbau" value={kellerbau} onChange={setKellerbau} min={100000} max={200000} step={5000} format={v => `€${(v/1000).toFixed(0)}k`} color="amber" />
            <SliderRow label="Abrisskosten" value={abrisskosten} onChange={setAbrisskosten} min={15000} max={50000} step={1000} format={v => `€${(v/1000).toFixed(0)}k`} color="red" />
            <SliderRow label="Innenausbau (Eigenleistung)" value={innenausbau} onChange={setInnenausbau} min={50000} max={150000} step={5000} format={v => `€${(v/1000).toFixed(0)}k`} color="amber" />
            <SliderRow label="Baunebenkosten" value={nebenkostenPercent} onChange={setNebenkostenPercent} min={8} max={15} step={1} format={v => `${v}%`} color="orange" />
          </div>
        )}
        {expandedSections.baukosten && (
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="p-3 bg-slate-800 rounded-lg text-center">
              <p className="text-slate-400 text-xs">Baukosten Basis</p>
              <p className="text-lg font-bold text-white">{formatCurrency(calculations.baukostenBasis)}</p>
            </div>
            <div className="p-3 bg-slate-800 rounded-lg text-center">
              <p className="text-slate-400 text-xs">+ Nebenkosten ({nebenkostenPercent}%)</p>
              <p className="text-lg font-bold text-orange-400">{formatCurrency(calculations.nebenkosten)}</p>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center">
              <p className="text-amber-300 text-xs">Gesamtbaukosten</p>
              <p className="text-xl font-bold text-amber-400">{formatCurrency(calculations.gesamtbaukosten)}</p>
            </div>
          </div>
        )}
        {expandedSections.baukosten && calculations.finanzierungslücke > 0 && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
            <AlertTriangle className="text-red-400" size={24} />
            <div>
              <p className="text-red-400 font-medium">Finanzierungslücke</p>
              <p className="text-slate-400 text-sm">Es fehlen noch {formatCurrency(calculations.finanzierungslücke)} zur vollständigen Finanzierung.</p>
            </div>
          </div>
        )}
      </Card>

      {/* 3. Mieteinnahmen */}
      <Card>
        <SectionHeader id="einnahmen" title="Mieteinnahmen & Marktwert" icon={<TrendingUp size={18} />} color="bg-gradient-to-r from-emerald-600 to-green-600" />
        {expandedSections.einnahmen && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SliderRow label="Preis pro m²" value={preisProQm} onChange={setPreisProQm} min={4000} max={8000} step={100} format={v => `€${v.toLocaleString()}/m²`} color="blue" />
            <SliderRow label="Miete pro m²" value={mieteProQm} onChange={setMieteProQm} min={12} max={22} step={0.5} format={v => `€${v.toFixed(1)}/m²`} color="emerald" />
            <SliderRow label="Penthouse-Aufpreis" value={penthouseAufpreis} onChange={setPenthouseAufpreis} min={10} max={30} step={1} format={v => `+${v}%`} color="purple" />
          </div>
        )}
        {expandedSections.einnahmen && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-center">
              <p className="text-emerald-300 text-xs">Miete/Monat</p>
              <p className="text-xl font-bold text-emerald-400">{formatCurrency(calculations.userMonatsMiete)}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-center">
              <p className="text-emerald-300 text-xs">Miete/Jahr</p>
              <p className="text-xl font-bold text-emerald-400">{formatCurrency(calculations.userJahresMiete)}</p>
            </div>
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-center">
              <p className="text-blue-300 text-xs">Marktwert (dein Anteil)</p>
              <p className="text-xl font-bold text-blue-400">{formatCurrency(calculations.userMarktwert)}</p>
            </div>
            <div className="p-3 bg-slate-800 rounded-lg text-center">
              <p className="text-slate-400 text-xs">Bruttomietrendite</p>
              <p className="text-xl font-bold text-white">{calculations.bruttomietrendite.toFixed(1)}%</p>
            </div>
          </div>
        )}
      </Card>

      {/* 4. Langfristplanung */}
      <Card>
        <SectionHeader id="langfrist" title="Langfristplanung (10+ Jahre)" icon={<TrendingUp size={18} />} color="bg-gradient-to-r from-purple-600 to-pink-600" />
        {expandedSections.langfrist && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <SliderRow label="Haltedauer" value={haltedauer} onChange={setHaltedauer} min={5} max={20} step={1} format={v => `${v} Jahre`} color="purple" />
            <SliderRow label="Wertsteigerung p.a." value={wertsteigerung} onChange={setWertsteigerung} min={0} max={5} step={0.5} format={v => `${v.toFixed(1)}%`} color="emerald" />
            <SliderRow label="Mietsteigerung p.a." value={mietsteigerung} onChange={setMietsteigerung} min={0} max={4} step={0.5} format={v => `${v.toFixed(1)}%`} color="blue" />
          </div>
        )}
        {expandedSections.langfrist && (
          <>
            {/* Projection Chart */}
            <div className="mt-6 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={calculations.projectionData}>
                  <defs>
                    <linearGradient id="projMarktwert" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="projEigenkapital" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="jahr" stroke="#64748b" tick={{ fill: '#94a3b8' }} />
                  <YAxis stroke="#64748b" tick={{ fill: '#94a3b8' }} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#f8fafc' }}
                    formatter={(value: number, name: string) => [formatCurrency(value), name === 'marktwert' ? 'Marktwert' : name === 'eigenkapital' ? 'Eigenkapital' : name === 'schulden' ? 'Schulden' : name]}
                  />
                  <Area type="monotone" dataKey="marktwert" stroke="#3b82f6" fillOpacity={1} fill="url(#projMarktwert)" strokeWidth={2} />
                  <Area type="monotone" dataKey="eigenkapital" stroke="#10b981" fillOpacity={1} fill="url(#projEigenkapital)" strokeWidth={2} />
                  <Area type="monotone" dataKey="schulden" stroke="#ef4444" fill="none" strokeWidth={2} strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* End of Period Stats */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-center">
                <p className="text-blue-300 text-xs">Marktwert nach {haltedauer}J</p>
                <p className="text-xl font-bold text-blue-400">{formatCurrency(calculations.projectionData[haltedauer]?.marktwert || 0)}</p>
              </div>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-center">
                <p className="text-emerald-300 text-xs">Eigenkapital nach {haltedauer}J</p>
                <p className="text-xl font-bold text-emerald-400">{formatCurrency(calculations.projectionData[haltedauer]?.eigenkapital || 0)}</p>
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center">
                <p className="text-amber-300 text-xs">Restschuld nach {haltedauer}J</p>
                <p className="text-xl font-bold text-amber-400">{formatCurrency(calculations.projectionData[haltedauer]?.schulden || 0)}</p>
              </div>
              <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg text-center">
                <p className="text-purple-300 text-xs">Kumulierte Cashflows</p>
                <p className="text-xl font-bold text-purple-400">{formatCurrency(calculations.projectionData[haltedauer]?.kumuliert || 0)}</p>
              </div>
            </div>

            {/* Spekulationsfrist Hinweis */}
            {haltedauer >= 10 && (
              <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3">
                <CheckCircle className="text-emerald-400" size={24} />
                <div>
                  <p className="text-emerald-400 font-medium">Steuerfreier Verkauf möglich</p>
                  <p className="text-slate-400 text-sm">Nach 10 Jahren Haltedauer entfällt die Spekulationssteuer bei Verkauf.</p>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Wirtschaftlichkeit */}
      <Card>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Calculator size={20} className="text-cyan-400" /> Wirtschaftlichkeit
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-3 bg-slate-800 rounded-lg text-center">
            <p className="text-slate-400 text-xs">Jahresmiete</p>
            <p className="text-lg font-bold text-emerald-400">{formatCurrency(calculations.userJahresMiete)}</p>
          </div>
          <div className="p-3 bg-slate-800 rounded-lg text-center">
            <p className="text-slate-400 text-xs">Bewirtschaftung (25%)</p>
            <p className="text-lg font-bold text-red-400">-{formatCurrency(calculations.bewirtschaftung)}</p>
          </div>
          <div className="p-3 bg-slate-800 rounded-lg text-center">
            <p className="text-slate-400 text-xs">NOI</p>
            <p className="text-lg font-bold text-white">{formatCurrency(calculations.noi)}</p>
          </div>
          <div className="p-3 bg-slate-800 rounded-lg text-center">
            <p className="text-slate-400 text-xs">Kapitaldienst</p>
            <p className="text-lg font-bold text-amber-400">-{formatCurrency(calculations.jährlicheRate)}</p>
          </div>
          <div className={`p-3 rounded-lg text-center ${calculations.cashflowVorSteuer >= 0 ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
            <p className={`text-xs ${calculations.cashflowVorSteuer >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>Cashflow/Jahr</p>
            <p className={`text-lg font-bold ${calculations.cashflowVorSteuer >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(calculations.cashflowVorSteuer)}</p>
          </div>
          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg text-center">
            <p className="text-purple-300 text-xs">AfA Steuerersparnis</p>
            <p className="text-lg font-bold text-purple-400">{formatCurrency(calculations.steuerersparnis)}/J</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="p-3 bg-slate-800 rounded-lg text-center">
            <p className="text-slate-400 text-xs">Bruttomietrendite</p>
            <p className="text-lg font-bold text-white">{calculations.bruttomietrendite.toFixed(1)}%</p>
          </div>
          <div className="p-3 bg-slate-800 rounded-lg text-center">
            <p className="text-slate-400 text-xs">Nettomietrendite</p>
            <p className="text-lg font-bold text-white">{calculations.nettomietrendite.toFixed(1)}%</p>
          </div>
          <div className="p-3 bg-slate-800 rounded-lg text-center">
            <p className="text-slate-400 text-xs">Eigenkapitalrendite</p>
            <p className={`text-lg font-bold ${calculations.eigenkapitalrendite >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{calculations.eigenkapitalrendite.toFixed(1)}%</p>
          </div>
        </div>
      </Card>

      {/* Info Box */}
      <Card className="bg-slate-800/50 border border-slate-700">
        <h4 className="text-sm font-semibold text-white mb-2">Projekthinweise</h4>
        <ul className="text-xs text-slate-400 space-y-1">
          <li>• <strong>Eigentumsaufteilung:</strong> Tini bringt das Grundstück ein und erhält 2 Wohnungen. Du finanzierst den Bau und erhältst 3 Wohnungen inkl. Penthouse.</li>
          <li>• <strong>Spekulationsfrist:</strong> Nach 10 Jahren Haltedauer können die Wohnungen steuerfrei verkauft werden.</li>
          <li>• <strong>KfW-Förderung:</strong> Für energieeffiziente Neubauten sind zinsgünstige Darlehen bis 150.000€ pro Wohneinheit möglich.</li>
          <li>• <strong>AfA:</strong> Du kannst 2% des Gebäudewerts (ca. 80% der Baukosten) jährlich steuerlich abschreiben.</li>
          <li>• Diese Simulation dient der Planung. Für verbindliche Entscheidungen einen Steuerberater und Finanzierungsberater hinzuziehen.</li>
        </ul>
      </Card>
    </div>
  );
};

// ===================== PROJEKTPLAN SIMULATOR (5 Wohnungen) =====================

const ProjektplanSimulator: React.FC<{ privacy: boolean }> = ({ privacy }) => {
  const unitTemplates = [
    { id: 'w1', name: 'Whg 1', size: 88, isPenthouse: false },
    { id: 'w2', name: 'Whg 2', size: 88, isPenthouse: false },
    { id: 'w3', name: 'Whg 3', size: 88, isPenthouse: false },
    { id: 'w4', name: 'Whg 4', size: 88, isPenthouse: false },
    { id: 'ph', name: 'Penthouse', size: 120, isPenthouse: true },
  ];

  // Finanzierung
  const [baukredit, setBaukredit] = useState(750000);
  const [zinssatz, setZinssatz] = useState(2.2);
  const [tilgung, setTilgung] = useState(2.0);
  const [zinsbindung, setZinsbindung] = useState(10);
  const [eigenkapital, setEigenkapital] = useState(200000);
  const [kfwDarlehen, setKfwDarlehen] = useState(100000);

  // Baukosten
  const [rohbau, setRohbau] = useState(440000);
  const [keller, setKeller] = useState(150000);
  const [abriss, setAbriss] = useState(25000);
  const [nebenkostenPct, setNebenkostenPct] = useState(12);
  const [innenausbau, setInnenausbau] = useState(80000);

  // Einheiten / Miete
  const [pricePerSqm, setPricePerSqm] = useState(5500);
  const [rentPerSqm, setRentPerSqm] = useState(17);
  const [ownedUnits, setOwnedUnits] = useState(3);
  const [penthousePremium, setPenthousePremium] = useState(20);

  // Langfrist
  const [holdYears, setHoldYears] = useState(10);
  const [appreciation, setAppreciation] = useState(2);
  const [rentGrowth, setRentGrowth] = useState(1.5);

  const {
    totalCosts,
    totalMarketValue,
    ownedMarketValue,
    yearlyRent,
    monthlyRent,
    primaryLoan,
    monthlyDebt,
    yearlyDebt,
    bewirtschaftungskosten,
    noi,
    dscr,
    cashflowBeforeTax,
    projection,
    equityToday,
    partnerValue,
    ownedSize,
    partnerSize,
  } = useMemo(() => {
    // owned units selection (3 incl. penthouse)
    const sortedUnits = [...unitTemplates];
    const owned = sortedUnits.slice(0, ownedUnits - 1).concat(sortedUnits.find(u => u.isPenthouse) || []);
    const partner = sortedUnits.filter(u => !owned.find(o => o.id === u.id));

    const baseCostSubtotal = rohbau + keller + abriss + innenausbau;
    const baunebenkosten = baseCostSubtotal * (nebenkostenPct / 100);
    const totalCosts = baseCostSubtotal + baunebenkosten;

    const unitValue = (u: typeof unitTemplates[number]) => {
      const premium = u.isPenthouse ? (1 + penthousePremium / 100) : 1;
      return u.size * pricePerSqm * premium;
    };
    const unitRent = (u: typeof unitTemplates[number]) => {
      const premium = u.isPenthouse ? (1 + penthousePremium / 100) : 1;
      return u.size * rentPerSqm * premium;
    };

    const totalMarketValue = unitTemplates.reduce((s, u) => s + unitValue(u), 0);
    const ownedMarketValue = owned.reduce((s, u) => s + unitValue(u), 0);
    const partnerValue = totalMarketValue - ownedMarketValue;
    const ownedSize = owned.reduce((s, u) => s + u.size, 0);
    const partnerSize = unitTemplates.reduce((s, u) => s + u.size, 0) - ownedSize;

    const monthlyRent = owned.reduce((s, u) => s + unitRent(u), 0);
    const yearlyRent = monthlyRent * 12;

    const primaryLoan = Math.max(0, Math.min(baukredit, totalCosts - eigenkapital - kfwDarlehen));
    const annuityRate = (zinssatz + tilgung) / 100;
    const monthlyDebt = primaryLoan * annuityRate / 12;
    const yearlyDebt = monthlyDebt * 12;

    const bewirtschaftungskosten = yearlyRent * 0.2; // 20% pauschal
    const noi = yearlyRent - bewirtschaftungskosten;
    const dscr = yearlyDebt > 0 ? noi / yearlyDebt : 0;
    const cashflowBeforeTax = noi - yearlyDebt;
    const equityToday = ownedMarketValue - primaryLoan;

    // Projection
    const iMonthly = zinssatz / 100 / 12;
    const payment = monthlyDebt;
    const projection = Array.from({ length: holdYears + 1 }).map((_, year) => {
      const n = year * 12;
      const remainingDebt = iMonthly > 0
        ? primaryLoan * Math.pow(1 + iMonthly, n) - payment * (Math.pow(1 + iMonthly, n) - 1) / iMonthly
        : Math.max(0, primaryLoan - payment * n);
      const value = ownedMarketValue * Math.pow(1 + appreciation / 100, year);
      const rentYear = yearlyRent * Math.pow(1 + rentGrowth / 100, year);
      const bwk = rentYear * 0.2;
      const noiYear = rentYear - bwk;
      const cf = noiYear - yearlyDebt;
      const equity = value - remainingDebt;
      return {
        year,
        value,
        debt: Math.max(0, remainingDebt),
        equity,
        cashflow: cf,
      };
    });

    return {
      totalCosts,
      totalMarketValue,
      ownedMarketValue,
      yearlyRent,
      monthlyRent,
      primaryLoan,
      monthlyDebt,
      yearlyDebt,
      bewirtschaftungskosten,
      noi,
      dscr,
      cashflowBeforeTax,
      projection,
      equityToday,
      partnerValue,
      ownedSize,
      partnerSize,
    };
  }, [abriss, baukredit, eigenkapital, holdYears, innenausbau, keller, kfwDarlehen, nebenkostenPct, ownedUnits, penthousePremium, pricePerSqm, rentGrowth, rentPerSqm, rohbau, tilgung, appreciation, zinssatz]);

  const fmt = (v: number) => privacy ? '****' : `€${Math.round(v).toLocaleString('de-DE')}`;

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-cyan-900/30 to-emerald-900/30 border-cyan-500/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">Projektplan: 5 Wohnungen (Tini & Du)</h3>
            <p className="text-slate-400 text-sm">Interaktive Simulation mit Parametern aus dem Projektplan</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-right">
            <div>
              <p className="text-slate-400">Gesamtinvest</p>
              <p className="text-lg font-bold text-white">{fmt(totalCosts)}</p>
            </div>
            <div>
              <p className="text-slate-400">Monatliche Rate</p>
              <p className="text-lg font-bold text-amber-400">{fmt(monthlyDebt)}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Finanzierung */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
            <PiggyBank size={16} className="text-white" />
          </div>
          <h4 className="text-white font-semibold">Finanzierung</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <SliderField label="Baukredit" min={500000} max={1000000} step={10000} value={baukredit} onChange={setBaukredit} suffix="€" />
          <SliderField label="Eigenkapital" min={50000} max={300000} step={5000} value={eigenkapital} onChange={setEigenkapital} suffix="€" />
          <SliderField label="KfW-Darlehen" min={0} max={150000} step={5000} value={kfwDarlehen} onChange={setKfwDarlehen} suffix="€" />
          <SliderField label="Zinssatz" min={1.5} max={5} step={0.1} value={zinssatz} onChange={setZinssatz} suffix="%" />
          <SliderField label="Tilgung" min={1} max={4} step={0.1} value={tilgung} onChange={setTilgung} suffix="%" />
          <SliderField label="Zinsbindung (Jahre)" min={5} max={20} step={1} value={zinsbindung} onChange={setZinsbindung} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <SummaryCard title="Finanzierungsbedarf" value={fmt(primaryLoan)} />
          <SummaryCard title="Monatsrate" value={fmt(monthlyDebt)} />
          <SummaryCard title="Jahresrate" value={fmt(yearlyDebt)} />
          <SummaryCard title="DSCR" value={dscr.toFixed(2)} accent={dscr >= 1.2 ? 'text-emerald-400' : dscr >= 1 ? 'text-amber-400' : 'text-red-400'} />
        </div>
      </Card>

      {/* Baukosten */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <HardHat size={16} className="text-white" />
          </div>
          <h4 className="text-white font-semibold">Baukosten</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <SliderField label="Fertighaus Rohbau" min={350000} max={550000} step={10000} value={rohbau} onChange={setRohbau} suffix="€" />
          <SliderField label="Kellerbau" min={100000} max={200000} step={5000} value={keller} onChange={setKeller} suffix="€" />
          <SliderField label="Abriss" min={15000} max={50000} step={1000} value={abriss} onChange={setAbriss} suffix="€" />
          <SliderField label="Innenausbau (Eigenleistung Material)" min={50000} max={150000} step={5000} value={innenausbau} onChange={setInnenausbau} suffix="€" />
          <SliderField label="Baunebenkosten %" min={8} max={15} step={0.5} value={nebenkostenPct} onChange={setNebenkostenPct} suffix="%" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <SummaryCard title="Gesamtbaukosten" value={fmt(totalCosts)} />
          <SummaryCard title="Bewirtschaftungskosten p.a." value={fmt(bewirtschaftungskosten)} />
          <SummaryCard title="Cashflow vor Steuer" value={fmt(cashflowBeforeTax)} accent={cashflowBeforeTax >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        </div>
      </Card>

      {/* Einheiten & Miete */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
            <Home size={16} className="text-white" />
          </div>
          <h4 className="text-white font-semibold">Wohneinheiten & Miete</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <SliderField label="Preis pro m²" min={4000} max={8000} step={100} value={pricePerSqm} onChange={setPricePerSqm} suffix="€" />
          <SliderField label="Miete pro m²" min={12} max={22} step={0.5} value={rentPerSqm} onChange={setRentPerSqm} suffix="€" />
          <SliderField label="Eigene Einheiten" min={2} max={5} step={1} value={ownedUnits} onChange={setOwnedUnits} />
          <SliderField label="Penthouse-Aufpreis" min={10} max={30} step={1} value={penthousePremium} onChange={setPenthousePremium} suffix="%" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <SummaryCard title="Eigentumsfläche (Du)" value={`${ownedSize} m²`} />
          <SummaryCard title="Wert (Du)" value={fmt(ownedMarketValue)} />
          <SummaryCard title="Wert (Tini)" value={fmt(partnerValue)} />
          <SummaryCard title="Miete (Monat)" value={fmt(monthlyRent)} />
        </div>
      </Card>

      {/* Langfrist & Projection */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <TrendingUp size={16} className="text-white" />
          </div>
          <h4 className="text-white font-semibold">Langfristplanung & Entwicklung</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          <SliderField label="Haltedauer (Jahre)" min={5} max={20} step={1} value={holdYears} onChange={setHoldYears} />
          <SliderField label="Wertsteigerung p.a." min={0} max={5} step={0.1} value={appreciation} onChange={setAppreciation} suffix="%" />
          <SliderField label="Mietsteigerung p.a." min={0} max={4} step={0.1} value={rentGrowth} onChange={setRentGrowth} suffix="%" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <SummaryCard title="Eigenkapital heute" value={fmt(equityToday)} />
          <SummaryCard title="NOI" value={fmt(noi)} />
          <SummaryCard title="Partner Fläche" value={`${partnerSize} m²`} />
          <SummaryCard title="Partner Wert" value={fmt(partnerValue)} />
        </div>

        <div className="h-72 mt-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projection}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="year" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <RechartsTooltip contentStyle={{ background: '#0f172a', border: '1px solid #1f2937' }} formatter={(v: number) => fmt(v)} />
              <Area type="monotone" dataKey="value" stroke="#22c55e" fill="#22c55e33" name="Wert" />
              <Area type="monotone" dataKey="debt" stroke="#f97316" fill="#f9731633" name="Restschuld" />
              <Area type="monotone" dataKey="equity" stroke="#38bdf8" fill="#38bdf833" name="Eigenkapital" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

// Reusable slider field
const SliderField: React.FC<{
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
}> = ({ label, min, max, step, value, onChange, suffix }) => (
  <div className="p-4 bg-slate-800/50 rounded-lg">
    <div className="flex items-center justify-between mb-2">
      <span className="text-slate-300 font-medium">{label}</span>
      <span className="text-lg font-bold text-white">
        {suffix === '%' ? `${value.toFixed(step < 1 ? 1 : 0)}%` : suffix === '€' ? `€${value.toLocaleString('de-DE')}` : value}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
    />
    <div className="flex justify-between text-xs text-slate-500 mt-1">
      <span>{suffix === '€' ? `€${min.toLocaleString('de-DE')}` : `${min}${suffix || ''}`}</span>
      <span>{suffix === '€' ? `€${max.toLocaleString('de-DE')}` : `${max}${suffix || ''}`}</span>
    </div>
  </div>
);

const SummaryCard: React.FC<{ title: string; value: string; accent?: string }> = ({ title, value, accent }) => (
  <div className="p-4 bg-slate-800 rounded-lg text-center">
    <p className="text-slate-400 text-xs uppercase mb-1">{title}</p>
    <p className={`text-xl font-bold ${accent || 'text-white'}`}>{value}</p>
  </div>
);

export default RealEstate;

