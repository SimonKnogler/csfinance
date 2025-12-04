
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home, 
  Plus, 
  Edit2, 
  Trash2, 
  X,
  TrendingUp,
  Building2,
  Wallet,
  PiggyBank,
  Calculator,
  ChevronDown,
  ChevronUp,
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
  Clock,
  CheckCircle2,
  Users
} from 'lucide-react';

enum SubView {
  OVERVIEW = 'Übersicht',
  BUSINESSPLAN = 'Businessplan',
  KAUFANALYSE = 'Kaufanalyse',
  RISIKO = 'Risiko',
  STEUER_EUR = 'Steuer EÜR',
  SIMULATOR = 'Simulator',
  BAUKOSTEN = 'Baukosten',
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
import { RealEstateProperty, PortfolioOwner } from '../types';
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
              onClick={() => setSubView(SubView.KAUFANALYSE)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                subView === SubView.KAUFANALYSE ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShoppingCart size={16} /> Kaufanalyse
            </button>
            <button
              onClick={() => setSubView(SubView.RISIKO)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                subView === SubView.RISIKO ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <AlertTriangle size={16} /> Risiko
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
              onClick={() => setSubView(SubView.BAUKOSTEN)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                subView === SubView.BAUKOSTEN ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <HardHat size={16} /> Baukosten
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
      {subView === SubView.KAUFANALYSE && (
        <PurchaseAnalyzer properties={properties} privacy={privacy} />
      )}

      {/* RISIKO VIEW */}
      {subView === SubView.RISIKO && (
        <RiskAnalyzer properties={properties} privacy={privacy} />
      )}

      {/* BUSINESSPLAN VIEW */}
      {subView === SubView.BUSINESSPLAN && (
        <BusinessPlanCalculator privacy={privacy} />
      )}

      {/* STEUER EÜR VIEW */}
      {subView === SubView.STEUER_EUR && (
        <TaxEURCalculator properties={properties} privacy={privacy} />
      )}

      {/* BAUKOSTEN VIEW */}
      {subView === SubView.BAUKOSTEN && (
        <BuildingCostSimulator privacy={privacy} />
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

// --- Building Cost Simulator ---
interface CostCategory {
  id: string;
  name: string;
  description: string;
  pricePerSqm: number;
  quantity: number;
  unit: string;
  isEnabled: boolean;
}

interface BuildingScenario {
  id: string;
  name: string;
  categories: CostCategory[];
  landPrice: number;
  buildingSize: number;
  contingency: number;
}

const DEFAULT_CATEGORIES: CostCategory[] = [
  { id: 'demolition', name: 'Abriss/Rückbau', description: 'Bestehendes Gebäude entfernen', pricePerSqm: 80, quantity: 0, unit: 'm²', isEnabled: false },
  { id: 'basement', name: 'Keller', description: 'Untergeschoss inkl. Abdichtung', pricePerSqm: 600, quantity: 0, unit: 'm²', isEnabled: false },
  { id: 'foundation', name: 'Bodenplatte', description: 'Alternative zum Keller', pricePerSqm: 180, quantity: 0, unit: 'm²', isEnabled: true },
  { id: 'shell-traditional', name: 'Rohbau (Massiv)', description: 'Traditionelle Bauweise', pricePerSqm: 650, quantity: 0, unit: 'm²', isEnabled: true },
  { id: 'shell-prefab', name: 'Rohbau (Fertighaus)', description: 'Fertighausbau', pricePerSqm: 550, quantity: 0, unit: 'm²', isEnabled: false },
  { id: 'roof', name: 'Dach', description: 'Dachstuhl + Eindeckung', pricePerSqm: 180, quantity: 0, unit: 'm² Dach', isEnabled: true },
  { id: 'windows', name: 'Fenster & Türen', description: 'Fenster, Haustür, Innentüren', pricePerSqm: 120, quantity: 0, unit: 'm² Wohnfl.', isEnabled: true },
  { id: 'facade', name: 'Fassade & Dämmung', description: 'Außenputz, WDVS', pricePerSqm: 140, quantity: 0, unit: 'm² Fassade', isEnabled: true },
  { id: 'electrical', name: 'Elektrik', description: 'Elektroinstallation komplett', pricePerSqm: 85, quantity: 0, unit: 'm² Wohnfl.', isEnabled: true },
  { id: 'plumbing', name: 'Sanitär', description: 'Wasserinstallation, Bäder', pricePerSqm: 95, quantity: 0, unit: 'm² Wohnfl.', isEnabled: true },
  { id: 'heating', name: 'Heizung', description: 'Wärmepumpe/Gas + Fußbodenheizung', pricePerSqm: 110, quantity: 0, unit: 'm² Wohnfl.', isEnabled: true },
  { id: 'drywall', name: 'Trockenbau', description: 'Wände, Decken, Dämmung', pricePerSqm: 65, quantity: 0, unit: 'm² Wohnfl.', isEnabled: true },
  { id: 'floors', name: 'Bodenbeläge', description: 'Parkett, Fliesen, Estrich', pricePerSqm: 75, quantity: 0, unit: 'm² Wohnfl.', isEnabled: true },
  { id: 'painting', name: 'Malerarbeiten', description: 'Innenputz, Streichen', pricePerSqm: 35, quantity: 0, unit: 'm² Wohnfl.', isEnabled: true },
  { id: 'kitchen', name: 'Küche', description: 'Einbauküche komplett', pricePerSqm: 0, quantity: 15000, unit: '€ pauschal', isEnabled: true },
  { id: 'parking', name: 'Stellplätze', description: 'Carport oder Garage', pricePerSqm: 0, quantity: 15000, unit: '€/Stellplatz', isEnabled: false },
  { id: 'garden', name: 'Garten & Außenanlage', description: 'Terrasse, Rasen, Zaun', pricePerSqm: 45, quantity: 0, unit: 'm² Garten', isEnabled: false },
  { id: 'driveway', name: 'Einfahrt & Wege', description: 'Pflaster, Asphalt', pricePerSqm: 80, quantity: 0, unit: 'm²', isEnabled: false },
];

const ANCILLARY_COSTS = [
  { id: 'notar', name: 'Notar & Grundbuch', percent: 2.0 },
  { id: 'grunderwerbsteuer', name: 'Grunderwerbsteuer', percent: 6.5 }, // Bayern: 3.5%, NRW: 6.5%
  { id: 'makler', name: 'Maklerprovision', percent: 3.57 },
  { id: 'architekt', name: 'Architekt/Planer', percent: 10.0 },
  { id: 'baugenehmigung', name: 'Baugenehmigung', percent: 0.5 },
  { id: 'bauleitung', name: 'Bauleitung', percent: 3.0 },
  { id: 'versicherung', name: 'Bauversicherungen', percent: 0.3 },
];

const BuildingCostSimulator: React.FC<{ privacy: boolean }> = ({ privacy }) => {
  // Scenarios for comparison
  const [scenarios, setScenarios] = useState<BuildingScenario[]>([
    {
      id: '1',
      name: 'Szenario 1',
      categories: DEFAULT_CATEGORIES.map(c => ({ ...c, quantity: c.pricePerSqm > 0 ? 150 : c.quantity })),
      landPrice: 150000,
      buildingSize: 150,
      contingency: 10,
    }
  ]);
  
  const [activeScenarioId, setActiveScenarioId] = useState('1');
  const [grunderwerbsteuerRate, setGrunderwerbsteuerRate] = useState(6.5);
  
  const activeScenario = scenarios.find(s => s.id === activeScenarioId) || scenarios[0];
  
  // Calculate costs for a scenario
  const calculateCosts = (scenario: BuildingScenario) => {
    let buildingCosts = 0;
    const breakdown: { name: string; cost: number }[] = [];
    
    scenario.categories.forEach(cat => {
      if (!cat.isEnabled) return;
      
      let cost = 0;
      if (cat.unit === '€ pauschal' || cat.unit === '€/Stellplatz') {
        cost = cat.quantity;
      } else if (cat.unit === 'm² Wohnfl.') {
        cost = cat.pricePerSqm * scenario.buildingSize;
      } else {
        cost = cat.pricePerSqm * cat.quantity;
      }
      
      if (cost > 0) {
        buildingCosts += cost;
        breakdown.push({ name: cat.name, cost });
      }
    });
    
    // Ancillary costs
    const totalBase = scenario.landPrice + buildingCosts;
    let ancillaryCosts = 0;
    const ancillaryBreakdown: { name: string; cost: number }[] = [];
    
    ANCILLARY_COSTS.forEach(cost => {
      let rate = cost.percent;
      if (cost.id === 'grunderwerbsteuer') {
        rate = grunderwerbsteuerRate;
      }
      const amount = (cost.id === 'makler' || cost.id === 'notar' || cost.id === 'grunderwerbsteuer')
        ? scenario.landPrice * (rate / 100)
        : buildingCosts * (rate / 100);
      ancillaryCosts += amount;
      ancillaryBreakdown.push({ name: cost.name, cost: amount });
    });
    
    // Contingency
    const contingencyAmount = buildingCosts * (scenario.contingency / 100);
    
    return {
      landPrice: scenario.landPrice,
      buildingCosts,
      ancillaryCosts,
      contingencyAmount,
      totalCost: scenario.landPrice + buildingCosts + ancillaryCosts + contingencyAmount,
      breakdown,
      ancillaryBreakdown,
      pricePerSqm: Math.round((scenario.landPrice + buildingCosts + ancillaryCosts + contingencyAmount) / scenario.buildingSize),
    };
  };
  
  const costs = calculateCosts(activeScenario);
  
  // Update category in active scenario
  const updateCategory = (categoryId: string, updates: Partial<CostCategory>) => {
    setScenarios(prev => prev.map(s => {
      if (s.id !== activeScenarioId) return s;
      return {
        ...s,
        categories: s.categories.map(c => 
          c.id === categoryId ? { ...c, ...updates } : c
        )
      };
    }));
  };
  
  // Update scenario settings
  const updateScenario = (updates: Partial<BuildingScenario>) => {
    setScenarios(prev => prev.map(s => 
      s.id === activeScenarioId ? { ...s, ...updates } : s
    ));
  };
  
  // Add new scenario
  const addScenario = () => {
    const newId = Date.now().toString();
    setScenarios(prev => [...prev, {
      id: newId,
      name: `Szenario ${prev.length + 1}`,
      categories: DEFAULT_CATEGORIES.map(c => ({ ...c, quantity: c.pricePerSqm > 0 ? 150 : c.quantity })),
      landPrice: 150000,
      buildingSize: 150,
      contingency: 10,
    }]);
    setActiveScenarioId(newId);
  };
  
  // Duplicate scenario
  const duplicateScenario = () => {
    const newId = Date.now().toString();
    setScenarios(prev => [...prev, {
      ...activeScenario,
      id: newId,
      name: `${activeScenario.name} (Kopie)`,
    }]);
    setActiveScenarioId(newId);
  };
  
  // Delete scenario
  const deleteScenario = (id: string) => {
    if (scenarios.length <= 1) return;
    setScenarios(prev => prev.filter(s => s.id !== id));
    if (activeScenarioId === id) {
      setActiveScenarioId(scenarios.find(s => s.id !== id)?.id || '1');
    }
  };
  
  // Comparison data
  const comparisonData = scenarios.map(s => {
    const c = calculateCosts(s);
    return {
      name: s.name,
      Grundstück: c.landPrice,
      Baukosten: c.buildingCosts,
      Nebenkosten: c.ancillaryCosts,
      Reserve: c.contingencyAmount,
      Gesamt: c.totalCost,
    };
  });
  
  return (
    <div className="space-y-6">
      {/* Scenario Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {scenarios.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveScenarioId(s.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              s.id === activeScenarioId 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {s.name}
            {scenarios.length > 1 && s.id === activeScenarioId && (
              <button
                onClick={(e) => { e.stopPropagation(); deleteScenario(s.id); }}
                className="ml-2 text-slate-400 hover:text-red-400"
              >
                <X size={14} />
              </button>
            )}
          </button>
        ))}
        <button
          onClick={addScenario}
          className="px-3 py-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <Plus size={16} />
        </button>
        <button
          onClick={duplicateScenario}
          className="px-3 py-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          title="Szenario duplizieren"
        >
          <Copy size={16} />
        </button>
      </div>
      
      {/* Basic Settings */}
      <Card>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Building2 size={20} /> Grundeinstellungen: {activeScenario.name}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Szenario-Name</label>
            <Input
              value={activeScenario.name}
              onChange={(e) => updateScenario({ name: e.target.value })}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Grundstückspreis (€)</label>
            <Input
              type="number"
              value={activeScenario.landPrice}
              onChange={(e) => updateScenario({ landPrice: Number(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Wohnfläche (m²)</label>
            <Input
              type="number"
              value={activeScenario.buildingSize}
              onChange={(e) => updateScenario({ buildingSize: Number(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Reserve/Puffer (%)</label>
            <Input
              type="number"
              value={activeScenario.contingency}
              onChange={(e) => updateScenario({ contingency: Number(e.target.value) })}
              min={0}
              max={30}
              className="w-full"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="text-sm text-slate-400 mb-1 block">Grunderwerbsteuer (%)</label>
          <div className="flex gap-2">
            {[3.5, 5.0, 6.0, 6.5].map(rate => (
              <button
                key={rate}
                onClick={() => setGrunderwerbsteuerRate(rate)}
                className={`px-3 py-1 rounded text-sm ${
                  grunderwerbsteuerRate === rate 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {rate}%
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-1">Bayern 3.5%, Sachsen 5.5%, NRW/Schl.-H. 6.5%</p>
        </div>
      </Card>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center border-l-4 border-l-emerald-500">
          <p className="text-slate-400 text-xs uppercase mb-1">Grundstück</p>
          <p className="text-xl font-bold text-emerald-400">
            {privacy ? '****' : `€${costs.landPrice.toLocaleString()}`}
          </p>
        </Card>
        <Card className="text-center border-l-4 border-l-blue-500">
          <p className="text-slate-400 text-xs uppercase mb-1">Baukosten</p>
          <p className="text-xl font-bold text-blue-400">
            {privacy ? '****' : `€${costs.buildingCosts.toLocaleString()}`}
          </p>
        </Card>
        <Card className="text-center border-l-4 border-l-amber-500">
          <p className="text-slate-400 text-xs uppercase mb-1">Nebenkosten</p>
          <p className="text-xl font-bold text-amber-400">
            {privacy ? '****' : `€${Math.round(costs.ancillaryCosts).toLocaleString()}`}
          </p>
        </Card>
        <Card className="text-center border-l-4 border-l-purple-500">
          <p className="text-slate-400 text-xs uppercase mb-1">Gesamtkosten</p>
          <p className="text-xl font-bold text-purple-400">
            {privacy ? '****' : `€${Math.round(costs.totalCost).toLocaleString()}`}
          </p>
          <p className="text-xs text-slate-500">{privacy ? '****' : `€${costs.pricePerSqm}/m²`}</p>
        </Card>
      </div>
      
      {/* Cost Categories */}
      <Card>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <HardHat size={20} /> Baukosten nach Gewerk
        </h3>
        <div className="space-y-2">
          {activeScenario.categories.map(cat => (
            <div 
              key={cat.id} 
              className={`grid grid-cols-12 gap-2 items-center p-3 rounded-lg transition-colors ${
                cat.isEnabled ? 'bg-slate-800' : 'bg-slate-800/30'
              }`}
            >
              <div className="col-span-1">
                <input
                  type="checkbox"
                  checked={cat.isEnabled}
                  onChange={(e) => updateCategory(cat.id, { isEnabled: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500"
                />
              </div>
              <div className="col-span-3">
                <p className={`font-medium ${cat.isEnabled ? 'text-white' : 'text-slate-500'}`}>{cat.name}</p>
                <p className="text-xs text-slate-500">{cat.description}</p>
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  value={cat.pricePerSqm}
                  onChange={(e) => updateCategory(cat.id, { pricePerSqm: Number(e.target.value) })}
                  disabled={!cat.isEnabled || cat.unit === '€ pauschal' || cat.unit === '€/Stellplatz'}
                  className="w-full text-sm"
                />
                <p className="text-xs text-slate-500">€/{cat.unit.includes('m²') ? 'm²' : 'Einheit'}</p>
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  value={cat.unit === 'm² Wohnfl.' ? activeScenario.buildingSize : cat.quantity}
                  onChange={(e) => updateCategory(cat.id, { quantity: Number(e.target.value) })}
                  disabled={!cat.isEnabled || cat.unit === 'm² Wohnfl.'}
                  className="w-full text-sm"
                />
                <p className="text-xs text-slate-500">{cat.unit}</p>
              </div>
              <div className="col-span-2 text-right">
                <p className={`font-semibold ${cat.isEnabled ? 'text-blue-400' : 'text-slate-600'}`}>
                  {privacy ? '****' : `€${(() => {
                    if (!cat.isEnabled) return 0;
                    if (cat.unit === '€ pauschal' || cat.unit === '€/Stellplatz') return cat.quantity;
                    if (cat.unit === 'm² Wohnfl.') return cat.pricePerSqm * activeScenario.buildingSize;
                    return cat.pricePerSqm * cat.quantity;
                  })().toLocaleString()}`}
                </p>
              </div>
              <div className="col-span-2">
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ 
                      width: `${Math.min(100, ((() => {
                        if (!cat.isEnabled) return 0;
                        if (cat.unit === '€ pauschal' || cat.unit === '€/Stellplatz') return cat.quantity;
                        if (cat.unit === 'm² Wohnfl.') return cat.pricePerSqm * activeScenario.buildingSize;
                        return cat.pricePerSqm * cat.quantity;
                      })() / costs.buildingCosts) * 100)}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
      
      {/* Ancillary Costs Breakdown */}
      <Card>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Calculator size={20} /> Nebenkosten Aufschlüsselung
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {costs.ancillaryBreakdown.map(item => (
            <div key={item.name} className="flex justify-between items-center p-2 bg-slate-800/50 rounded">
              <span className="text-slate-300">{item.name}</span>
              <span className="text-amber-400 font-medium">
                {privacy ? '****' : `€${Math.round(item.cost).toLocaleString()}`}
              </span>
            </div>
          ))}
          <div className="md:col-span-2 flex justify-between items-center p-3 bg-slate-700 rounded font-semibold">
            <span className="text-white">+ Reserve ({activeScenario.contingency}%)</span>
            <span className="text-purple-400">
              {privacy ? '****' : `€${Math.round(costs.contingencyAmount).toLocaleString()}`}
            </span>
          </div>
        </div>
      </Card>
      
      {/* Scenario Comparison */}
      {scenarios.length > 1 && (
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4">Szenario-Vergleich</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                  formatter={(value: number) => `€${value.toLocaleString()}`}
                />
                <Legend />
                <Bar dataKey="Grundstück" stackId="a" fill="#10b981" />
                <Bar dataKey="Baukosten" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Nebenkosten" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Reserve" stackId="a" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Comparison Table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700">
                  <th className="text-left py-2 px-2">Szenario</th>
                  <th className="text-right py-2 px-2">Grundstück</th>
                  <th className="text-right py-2 px-2">Baukosten</th>
                  <th className="text-right py-2 px-2">Nebenkosten</th>
                  <th className="text-right py-2 px-2">Reserve</th>
                  <th className="text-right py-2 px-2 font-semibold">Gesamt</th>
                  <th className="text-right py-2 px-2">€/m²</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map(s => {
                  const c = calculateCosts(s);
                  return (
                    <tr key={s.id} className={`border-b border-slate-800 ${s.id === activeScenarioId ? 'bg-slate-800/50' : ''}`}>
                      <td className="py-2 px-2 text-white font-medium">{s.name}</td>
                      <td className="py-2 px-2 text-right text-emerald-400">
                        {privacy ? '****' : `€${c.landPrice.toLocaleString()}`}
                      </td>
                      <td className="py-2 px-2 text-right text-blue-400">
                        {privacy ? '****' : `€${c.buildingCosts.toLocaleString()}`}
                      </td>
                      <td className="py-2 px-2 text-right text-amber-400">
                        {privacy ? '****' : `€${Math.round(c.ancillaryCosts).toLocaleString()}`}
                      </td>
                      <td className="py-2 px-2 text-right text-purple-400">
                        {privacy ? '****' : `€${Math.round(c.contingencyAmount).toLocaleString()}`}
                      </td>
                      <td className="py-2 px-2 text-right text-white font-semibold">
                        {privacy ? '****' : `€${Math.round(c.totalCost).toLocaleString()}`}
                      </td>
                      <td className="py-2 px-2 text-right text-slate-400">
                        {privacy ? '****' : `€${c.pricePerSqm}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      
      {/* Info Box */}
      <Card className="bg-slate-800/50 border border-slate-700">
        <h4 className="text-sm font-semibold text-white mb-2">Hinweise zur Kalkulation</h4>
        <ul className="text-xs text-slate-400 space-y-1">
          <li>• Die Preise sind Richtwerte für Deutschland (2024) und variieren stark nach Region</li>
          <li>• Massivbau ist meist teurer als Fertighaus, bietet aber mehr Flexibilität</li>
          <li>• Keller vs. Bodenplatte: ~€400-500/m² Unterschied, aber mehr Nutzfläche</li>
          <li>• Architektenhonorar nach HOAI: 10-15% der Baukosten (alle Leistungsphasen)</li>
          <li>• Reserve von 10-15% ist empfohlen für unvorhergesehene Kosten</li>
        </ul>
      </Card>
    </div>
  );
};

// ===================== PURCHASE ANALYZER =====================

// Grunderwerbsteuer by German state
const GRUNDERWERBSTEUER: Record<string, number> = {
  'Baden-Württemberg': 5.0,
  'Bayern': 3.5,
  'Berlin': 6.0,
  'Brandenburg': 6.5,
  'Bremen': 5.0,
  'Hamburg': 5.5,
  'Hessen': 6.0,
  'Mecklenburg-Vorpommern': 6.0,
  'Niedersachsen': 5.0,
  'Nordrhein-Westfalen': 6.5,
  'Rheinland-Pfalz': 5.0,
  'Saarland': 6.5,
  'Sachsen': 5.5,
  'Sachsen-Anhalt': 5.0,
  'Schleswig-Holstein': 6.5,
  'Thüringen': 5.0,
};

type PurchaseMode = 'kauf' | 'neubau';

const PurchaseAnalyzer: React.FC<{
  properties: RealEstateProperty[];
  privacy: boolean;
}> = ({ properties, privacy }) => {
  // Mode: Kauf mit Grundstück vs. Neubau auf eigenem Grund
  const [mode, setMode] = useState<PurchaseMode>('kauf');
  
  // Purchase Analysis State
  const [purchasePrice, setPurchasePrice] = useState(500000); // Bei Neubau = Baukosten
  const [grundstueckswert, setGrundstueckswert] = useState(150000); // Wert des bereits vorhandenen Grundstücks
  const [eigenleistung, setEigenleistung] = useState(50000); // Eigenleistung (spart Kosten)
  const [bundesland, setBundesland] = useState('Bayern');
  const [maklerProvision, setMaklerProvision] = useState(3.57);
  
  // Marktwert-Berechnung (für Neubau)
  const [anzahlWohnungen, setAnzahlWohnungen] = useState(6);
  const [wertProWohnung, setWertProWohnung] = useState(500000);
  const [useManualMarktwert, setUseManualMarktwert] = useState(false);
  const [manualMarktwert, setManualMarktwert] = useState(3000000);
  
  // Mieteinnahmen
  const [monthlyRent, setMonthlyRent] = useState(1500);
  const [monthlyExpenses, setMonthlyExpenses] = useState(400);
  const [eigenkapital, setEigenkapital] = useState(100000);
  const [zinssatz, setZinssatz] = useState(3.5);
  const [tilgung, setTilgung] = useState(2.0);
  const [zinsbindung, setZinsbindung] = useState(15);
  
  // Berechneter Marktwert
  const marktwert = useMemo(() => {
    if (mode === 'kauf') return purchasePrice; // Bei Kauf = Kaufpreis
    if (useManualMarktwert) return manualMarktwert;
    return anzahlWohnungen * wertProWohnung;
  }, [mode, useManualMarktwert, manualMarktwert, anzahlWohnungen, wertProWohnung, purchasePrice]);

  // Kaufnebenkosten calculation - unterschiedlich je nach Modus
  const kaufnebenkosten = useMemo(() => {
    if (mode === 'neubau') {
      // Bei Neubau auf eigenem Grund: keine Grunderwerbsteuer, kein Makler
      // Nur Notar für Bauvertrag/Grundschuld und evtl. Baugenehmigung
      const notar = purchasePrice * 0.01; // ~1% für Grundschuldbestellung
      const grundbuch = purchasePrice * 0.003; // Geringer da nur Grundschuld
      const baugenehmigung = 2000; // Pauschale
      const total = notar + grundbuch + baugenehmigung;
      return { grunderwerbsteuer: 0, notar, grundbuch, makler: 0, baugenehmigung, total };
    } else {
      // Normaler Kauf mit Grundstück
      const grunderwerbsteuer = purchasePrice * (GRUNDERWERBSTEUER[bundesland] / 100);
      const notar = purchasePrice * 0.015;
      const grundbuch = purchasePrice * 0.005;
      const makler = purchasePrice * (maklerProvision / 100);
      const total = grunderwerbsteuer + notar + grundbuch + makler;
      return { grunderwerbsteuer, notar, grundbuch, makler, baugenehmigung: 0, total };
    }
  }, [purchasePrice, bundesland, maklerProvision, mode]);

  // Total investment & financing
  const finanzierung = useMemo(() => {
    // Bei Neubau: Baukosten abzüglich Eigenleistung + Nebenkosten
    const effektiveBaukosten = mode === 'neubau' ? Math.max(0, purchasePrice - eigenleistung) : purchasePrice;
    const finanzierungsbedarf = effektiveBaukosten + kaufnebenkosten.total;
    
    // Gesamtinvestition (was tatsächlich reingesteckt wird)
    const gesamtinvestition = mode === 'neubau' 
      ? effektiveBaukosten + kaufnebenkosten.total + grundstueckswert 
      : purchasePrice + kaufnebenkosten.total;
    
    // Bei Neubau: Grundstück + Eigenleistung zählen als Eigenkapital
    const effektivesEigenkapital = mode === 'neubau' 
      ? eigenkapital + grundstueckswert + eigenleistung 
      : eigenkapital;
    
    const fremdkapital = Math.max(0, finanzierungsbedarf - eigenkapital);
    
    // Eigenkapitalquote bezogen auf Marktwert (realistischer)
    const eigenkapitalQuoteInvestition = (effektivesEigenkapital / gesamtinvestition) * 100;
    const eigenkapitalQuoteMarktwert = (effektivesEigenkapital / marktwert) * 100;
    
    // Wertsteigerung durch Bau
    const wertsteigerung = mode === 'neubau' ? marktwert - gesamtinvestition : 0;
    const wertsteigerungProzent = mode === 'neubau' && gesamtinvestition > 0 
      ? (wertsteigerung / gesamtinvestition) * 100 
      : 0;
    const monatlicheRate = fremdkapital * ((zinssatz + tilgung) / 100 / 12);
    const jahresRate = monatlicheRate * 12;
    
    // Calculate different terms
    const calculatePayoff = (principal: number, rate: number, repayment: number) => {
      let remaining = principal;
      let years = 0;
      const annualPayment = principal * (rate + repayment) / 100;
      while (remaining > 0 && years < 50) {
        const interest = remaining * rate / 100;
        const principal = annualPayment - interest;
        remaining -= principal;
        years++;
      }
      return years;
    };
    
    const yearsToPayoff = calculatePayoff(fremdkapital, zinssatz, tilgung);
    
    // Remaining debt at end of fixed interest period
    let remainingAtEnd = fremdkapital;
    for (let i = 0; i < zinsbindung; i++) {
      const interest = remainingAtEnd * zinssatz / 100;
      const principal = jahresRate - interest;
      remainingAtEnd -= principal;
    }
    
    return {
      gesamtinvestition,
      finanzierungsbedarf,
      effektiveBaukosten,
      fremdkapital,
      eigenkapitalQuoteInvestition,
      eigenkapitalQuoteMarktwert,
      effektivesEigenkapital,
      wertsteigerung,
      wertsteigerungProzent,
      monatlicheRate,
      jahresRate,
      yearsToPayoff,
      remainingAtEnd: Math.max(0, remainingAtEnd),
    };
  }, [purchasePrice, kaufnebenkosten.total, eigenkapital, zinssatz, tilgung, zinsbindung, mode, grundstueckswert, eigenleistung, marktwert]);

  // Rendite calculations
  const rendite = useMemo(() => {
    const jahresmiete = monthlyRent * 12;
    const jahresExpenses = monthlyExpenses * 12;
    
    // Mietrendite bezogen auf Marktwert (realistisch)
    const bruttomietrenditeMarktwert = (jahresmiete / marktwert) * 100;
    const nettomietrenditeMarktwert = ((jahresmiete - jahresExpenses) / marktwert) * 100;
    
    // Mietrendite bezogen auf Investment (was reingesteckt wurde)
    const bruttomietrenditeInvestition = (jahresmiete / finanzierung.gesamtinvestition) * 100;
    const nettomietrenditeInvestition = ((jahresmiete - jahresExpenses) / finanzierung.gesamtinvestition) * 100;
    
    // Eigenkapitalrendite (ROE) - Cashflow bezogen auf eingesetztes Eigenkapital
    const nettoEinkommen = jahresmiete - jahresExpenses - finanzierung.jahresRate;
    const eigenkapitalRendite = eigenkapital > 0 ? (nettoEinkommen / eigenkapital) * 100 : 0;
    
    // Gesamtrendite inkl. Wertsteigerung (für Jahr 1)
    const gesamtrenditeJahr1 = eigenkapital > 0 
      ? ((nettoEinkommen + finanzierung.wertsteigerung) / eigenkapital) * 100 
      : 0;
    
    // Cashflow
    const monthlyCashflow = monthlyRent - monthlyExpenses - finanzierung.monatlicheRate;
    
    // Break-even rent (minimal rent to cover all costs)
    const breakEvenRent = finanzierung.monatlicheRate + monthlyExpenses;
    
    // Comparison with ETF (7% p.a.)
    const etfReturn = eigenkapital * 0.07;
    const realEstateReturn = nettoEinkommen;
    
    // Mietmultiplikator (Kaufpreis/Jahresmiete)
    const mietmultiplikator = jahresmiete > 0 ? marktwert / jahresmiete : 0;
    
    return {
      bruttomietrenditeMarktwert,
      nettomietrenditeMarktwert,
      bruttomietrenditeInvestition,
      nettomietrenditeInvestition,
      eigenkapitalRendite,
      gesamtrenditeJahr1,
      monthlyCashflow,
      breakEvenRent,
      etfReturn,
      realEstateReturn,
      mietmultiplikator,
    };
  }, [monthlyRent, monthlyExpenses, marktwert, eigenkapital, finanzierung]);

  // Financing term comparison
  const finanzierungsVergleich = useMemo(() => {
    const terms = [10, 15, 20, 25, 30];
    return terms.map(years => {
      const requiredTilgung = 100 / years;
      const annualRate = finanzierung.fremdkapital * (zinssatz + requiredTilgung) / 100;
      const monthlyRate = annualRate / 12;
      const totalInterest = (annualRate * years) - finanzierung.fremdkapital;
      
      return {
        years,
        tilgung: requiredTilgung,
        monthlyRate,
        totalInterest,
        totalCost: finanzierung.fremdkapital + totalInterest,
      };
    });
  }, [finanzierung.fremdkapital, zinssatz]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <ShoppingCart size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Kaufanalyse</h3>
            <p className="text-slate-400 text-sm">Kaufnebenkosten, Rendite & Finanzierung</p>
          </div>
        </div>
        {/* Mode Toggle */}
        <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
          <button
            onClick={() => setMode('kauf')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'kauf' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Kauf mit Grundstück
          </button>
          <button
            onClick={() => setMode('neubau')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'neubau' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Neubau auf eigenem Grund
          </button>
        </div>
      </div>

      {/* Info Box for Neubau Mode */}
      {mode === 'neubau' && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-200 text-sm">
          <HardHat size={20} className="flex-shrink-0" />
          <p>
            <strong>Neubau auf eigenem Grundstück:</strong> Da Sie das Grundstück bereits besitzen, entfallen Grunderwerbsteuer und Maklergebühren. 
            Nur Notar für Grundschuldbestellung und Baugenehmigung werden berechnet.
          </p>
        </div>
      )}

      {/* Input Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kaufpreis/Baukosten & Nebenkosten */}
        <Card>
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Building2 size={18} className="text-emerald-400" /> 
            {mode === 'neubau' ? 'Baukosten & Grundstück' : 'Kaufpreis & Nebenkosten'}
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                {mode === 'neubau' ? 'Baukosten (€)' : 'Kaufpreis (€)'}
              </label>
              <Input
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(Number(e.target.value))}
              />
              {mode === 'neubau' && (
                <p className="text-xs text-slate-500 mt-1">Reine Baukosten ohne Grundstück</p>
              )}
            </div>
            {mode === 'neubau' && (
              <>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Eigenleistung (€)</label>
                  <Input
                    type="number"
                    value={eigenleistung}
                    onChange={(e) => setEigenleistung(Number(e.target.value))}
                  />
                  <p className="text-xs text-slate-500 mt-1">Selbst ausgeführte Arbeiten (spart Kosten)</p>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Grundstückswert (€)</label>
                  <Input
                    type="number"
                    value={grundstueckswert}
                    onChange={(e) => setGrundstueckswert(Number(e.target.value))}
                  />
                  <p className="text-xs text-slate-500 mt-1">Aktueller Verkehrswert des vorhandenen Grundstücks</p>
                </div>
              </>
            )}
            {mode === 'kauf' && (
              <>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Bundesland</label>
                  <Select
                    value={bundesland}
                    onChange={(e) => setBundesland(e.target.value)}
                  >
                    {Object.keys(GRUNDERWERBSTEUER).map(state => (
                      <option key={state} value={state}>{state} ({GRUNDERWERBSTEUER[state]}%)</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Maklerprovision (%)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={maklerProvision}
                    onChange={(e) => setMaklerProvision(Number(e.target.value))}
                  />
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Mieteinnahmen */}
        <Card>
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Wallet size={18} className="text-blue-400" /> Mieteinnahmen
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Kaltmiete / Monat (€)</label>
              <Input
                type="number"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Nicht-umlagefähige Kosten / Monat (€)</label>
              <Input
                type="number"
                value={monthlyExpenses}
                onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
              />
              <p className="text-xs text-slate-500 mt-1">Hausgeld, Grundsteuer, Versicherung, Instandhaltung</p>
            </div>
          </div>
        </Card>

        {/* Finanzierung */}
        <Card>
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <PiggyBank size={18} className="text-amber-400" /> Finanzierung
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Eigenkapital (€)</label>
              <Input
                type="number"
                value={eigenkapital}
                onChange={(e) => setEigenkapital(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Zinssatz (%)</label>
              <Input
                type="number"
                step="0.1"
                value={zinssatz}
                onChange={(e) => setZinssatz(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Anfangstilgung (%)</label>
              <Input
                type="number"
                step="0.1"
                value={tilgung}
                onChange={(e) => setTilgung(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Zinsbindung (Jahre)</label>
              <Input
                type="number"
                value={zinsbindung}
                onChange={(e) => setZinsbindung(Number(e.target.value))}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Marktwert-Berechnung (nur bei Neubau) */}
      {mode === 'neubau' && (
        <Card className="bg-gradient-to-r from-emerald-900/20 to-teal-900/20 border-emerald-500/30">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-400" /> Marktwert-Berechnung
          </h4>
          <p className="text-slate-400 text-sm mb-4">
            Der Marktwert ist oft deutlich höher als die Baukosten - besonders bei Mehrfamilienhäusern in guter Lage.
          </p>
          
          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!useManualMarktwert}
                onChange={() => setUseManualMarktwert(false)}
                className="w-4 h-4 text-emerald-500 border-slate-600 bg-slate-800 focus:ring-emerald-500"
              />
              <span className="text-slate-300">Nach Wohneinheiten berechnen</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={useManualMarktwert}
                onChange={() => setUseManualMarktwert(true)}
                className="w-4 h-4 text-emerald-500 border-slate-600 bg-slate-800 focus:ring-emerald-500"
              />
              <span className="text-slate-300">Manuell eingeben</span>
            </label>
          </div>

          {useManualMarktwert ? (
            <div>
              <label className="block text-sm text-slate-400 mb-1">Geschätzter Marktwert (€)</label>
              <Input
                type="number"
                value={manualMarktwert}
                onChange={(e) => setManualMarktwert(Number(e.target.value))}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Anzahl Wohnungen</label>
                <Input
                  type="number"
                  value={anzahlWohnungen}
                  onChange={(e) => setAnzahlWohnungen(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Wert pro Wohnung (€)</label>
                <Input
                  type="number"
                  value={wertProWohnung}
                  onChange={(e) => setWertProWohnung(Number(e.target.value))}
                />
                <p className="text-xs text-slate-500 mt-1">Basierend auf Lage (z.B. Rosenheim, gute Nachbarschaft)</p>
              </div>
            </div>
          )}

          <div className="mt-4 p-4 bg-slate-800/50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Geschätzter Marktwert</span>
              <span className="text-3xl font-bold text-emerald-400">
                <Money value={marktwert} privacy={privacy} fractionDigits={0} />
              </span>
            </div>
            {finanzierung.wertsteigerung > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between items-center">
                <span className="text-slate-400">Wertsteigerung durch Bau</span>
                <div className="text-right">
                  <span className="text-xl font-bold text-emerald-400">
                    +<Money value={finanzierung.wertsteigerung} privacy={privacy} fractionDigits={0} />
                  </span>
                  <span className="text-emerald-400 text-sm ml-2">
                    (+{finanzierung.wertsteigerungProzent.toFixed(0)}%)
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Results Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kaufnebenkosten Breakdown */}
        <Card>
          <h4 className="text-lg font-semibold text-white mb-4">
            {mode === 'neubau' ? 'Kosten & Nebenkosten' : 'Kaufnebenkosten'}
          </h4>
          <div className="space-y-3">
            {mode === 'neubau' ? (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-400">Grundstück (vorhanden)</span>
                  <span className="text-emerald-400 font-medium"><Money value={grundstueckswert} privacy={privacy} /></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Baukosten (brutto)</span>
                  <span className="text-white font-medium"><Money value={purchasePrice} privacy={privacy} /></span>
                </div>
                {eigenleistung > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">- Eigenleistung (spart)</span>
                    <span className="text-emerald-400 font-medium">-<Money value={eigenleistung} privacy={privacy} /></span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">= Effektive Baukosten</span>
                  <span className="text-white font-medium"><Money value={finanzierung.effektiveBaukosten} privacy={privacy} /></span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-slate-400">Notar (Grundschuld ~1%)</span>
                  <span className="text-red-400"><Money value={kaufnebenkosten.notar} privacy={privacy} /></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Grundbuch (Grundschuld)</span>
                  <span className="text-red-400"><Money value={kaufnebenkosten.grundbuch} privacy={privacy} /></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Baugenehmigung</span>
                  <span className="text-red-400"><Money value={kaufnebenkosten.baugenehmigung} privacy={privacy} /></span>
                </div>
                <div className="flex justify-between text-slate-500 line-through">
                  <span>Grunderwerbsteuer</span>
                  <span>€0 (entfällt)</span>
                </div>
                <div className="flex justify-between text-slate-500 line-through">
                  <span>Makler</span>
                  <span>€0 (entfällt)</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-400">Kaufpreis</span>
                  <span className="text-white font-medium"><Money value={purchasePrice} privacy={privacy} /></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Grunderwerbsteuer ({GRUNDERWERBSTEUER[bundesland]}%)</span>
                  <span className="text-red-400"><Money value={kaufnebenkosten.grunderwerbsteuer} privacy={privacy} /></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Notar (~1.5%)</span>
                  <span className="text-red-400"><Money value={kaufnebenkosten.notar} privacy={privacy} /></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Grundbuch (~0.5%)</span>
                  <span className="text-red-400"><Money value={kaufnebenkosten.grundbuch} privacy={privacy} /></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Makler ({maklerProvision}%)</span>
                  <span className="text-red-400"><Money value={kaufnebenkosten.makler} privacy={privacy} /></span>
                </div>
              </>
            )}
            <div className="border-t border-slate-700 pt-3 flex justify-between">
              <span className="text-white font-semibold">Nebenkosten Gesamt</span>
              <span className="text-red-400 font-bold"><Money value={kaufnebenkosten.total} privacy={privacy} /></span>
            </div>
            {mode === 'neubau' && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-400">Finanzierungsbedarf</span>
                  <span className="text-amber-400 font-medium"><Money value={finanzierung.finanzierungsbedarf} privacy={privacy} /></span>
                </div>
                <div className="flex justify-between bg-slate-800 p-3 rounded-lg">
                  <span className="text-white font-semibold">Gesamtinvestition</span>
                  <span className="text-white font-bold text-lg"><Money value={finanzierung.gesamtinvestition} privacy={privacy} /></span>
                </div>
                <div className="flex justify-between bg-emerald-900/30 p-3 rounded-lg border border-emerald-500/30">
                  <span className="text-emerald-300 font-semibold">Marktwert nach Fertigstellung</span>
                  <span className="text-emerald-400 font-bold text-lg"><Money value={marktwert} privacy={privacy} /></span>
                </div>
              </>
            )}
            {mode === 'kauf' && (
              <div className="flex justify-between bg-slate-800 p-3 rounded-lg">
                <span className="text-white font-semibold">Gesamtinvestition</span>
                <span className="text-white font-bold text-lg"><Money value={finanzierung.gesamtinvestition} privacy={privacy} /></span>
              </div>
            )}
          </div>
        </Card>

        {/* Finanzierung Details */}
        <Card>
          <h4 className="text-lg font-semibold text-white mb-4">Finanzierung</h4>
          <div className="space-y-3">
            {mode === 'neubau' ? (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-400">Grundstück (vorhanden)</span>
                  <span className="text-emerald-400 font-medium"><Money value={grundstueckswert} privacy={privacy} /></span>
                </div>
                {eigenleistung > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">+ Eigenleistung</span>
                    <span className="text-emerald-400 font-medium"><Money value={eigenleistung} privacy={privacy} /></span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">+ Bares Eigenkapital</span>
                  <span className="text-emerald-400 font-medium"><Money value={eigenkapital} privacy={privacy} /></span>
                </div>
                <div className="flex justify-between border-t border-slate-700 pt-2">
                  <span className="text-white font-semibold">= Gesamtes Eigenkapital</span>
                  <span className="text-emerald-400 font-bold"><Money value={finanzierung.effektivesEigenkapital} privacy={privacy} /></span>
                </div>
              </>
            ) : (
              <div className="flex justify-between">
                <span className="text-slate-400">Eigenkapital</span>
                <span className="text-emerald-400 font-medium"><Money value={eigenkapital} privacy={privacy} /></span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Fremdkapital (Kredit)</span>
              <span className="text-amber-400 font-medium"><Money value={finanzierung.fremdkapital} privacy={privacy} /></span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">EK-Quote (Investition)</span>
              <span className={`font-medium ${finanzierung.eigenkapitalQuoteInvestition >= 20 ? 'text-emerald-400' : 'text-red-400'}`}>
                {finanzierung.eigenkapitalQuoteInvestition.toFixed(1)}%
              </span>
            </div>
            {mode === 'neubau' && (
              <div className="flex justify-between">
                <span className="text-slate-400">EK-Quote (Marktwert)</span>
                <span className="text-emerald-400 font-medium">
                  {finanzierung.eigenkapitalQuoteMarktwert.toFixed(1)}%
                </span>
              </div>
            )}
            <div className="border-t border-slate-700 pt-3 flex justify-between">
              <span className="text-white font-semibold">Monatliche Rate</span>
              <span className="text-white font-bold"><Money value={finanzierung.monatlicheRate} privacy={privacy} /></span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Laufzeit bis Tilgung</span>
              <span className="text-white font-medium">~{finanzierung.yearsToPayoff} Jahre</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Restschuld nach {zinsbindung}J</span>
              <span className="text-amber-400 font-medium"><Money value={finanzierung.remainingAtEnd} privacy={privacy} /></span>
            </div>
          </div>
        </Card>
      </div>

      {/* Rendite Kennzahlen */}
      <Card>
        <h4 className="text-lg font-semibold text-white mb-4">Rendite-Kennzahlen</h4>
        
        {/* Wertsteigerung Highlight (nur bei Neubau) */}
        {mode === 'neubau' && finanzierung.wertsteigerung > 0 && (
          <div className="mb-4 p-4 bg-gradient-to-r from-emerald-900/30 to-teal-900/30 rounded-lg border border-emerald-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-300 font-semibold">Wertsteigerung durch Bau</p>
                <p className="text-slate-400 text-sm">Marktwert vs. Investition</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-emerald-400">
                  +<Money value={finanzierung.wertsteigerung} privacy={privacy} fractionDigits={0} />
                </p>
                <p className="text-emerald-400 text-sm">+{finanzierung.wertsteigerungProzent.toFixed(0)}% Gewinn</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-slate-800 p-4 rounded-lg text-center">
            <p className="text-slate-400 text-xs uppercase mb-1">
              {mode === 'neubau' ? 'Bruttorendite (Invest.)' : 'Bruttomietrendite'}
            </p>
            <p className={`text-2xl font-bold ${rendite.bruttomietrenditeInvestition >= 5 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {rendite.bruttomietrenditeInvestition.toFixed(2)}%
            </p>
            {mode === 'neubau' && (
              <p className="text-xs text-slate-500 mt-1">
                Marktwert: {rendite.bruttomietrenditeMarktwert.toFixed(2)}%
              </p>
            )}
          </div>
          <div className="bg-slate-800 p-4 rounded-lg text-center">
            <p className="text-slate-400 text-xs uppercase mb-1">
              {mode === 'neubau' ? 'Nettorendite (Invest.)' : 'Nettomietrendite'}
            </p>
            <p className={`text-2xl font-bold ${rendite.nettomietrenditeInvestition >= 3 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {rendite.nettomietrenditeInvestition.toFixed(2)}%
            </p>
            {mode === 'neubau' && (
              <p className="text-xs text-slate-500 mt-1">
                Marktwert: {rendite.nettomietrenditeMarktwert.toFixed(2)}%
              </p>
            )}
          </div>
          <div className="bg-slate-800 p-4 rounded-lg text-center">
            <p className="text-slate-400 text-xs uppercase mb-1">Eigenkapitalrendite</p>
            <p className={`text-2xl font-bold ${rendite.eigenkapitalRendite >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {rendite.eigenkapitalRendite.toFixed(2)}%
            </p>
            <p className="text-xs text-slate-500 mt-1">Cashflow / EK</p>
          </div>
          {mode === 'neubau' && (
            <div className="bg-gradient-to-br from-emerald-800/30 to-teal-800/30 p-4 rounded-lg text-center border border-emerald-500/30">
              <p className="text-emerald-300 text-xs uppercase mb-1">Gesamtrendite Jahr 1</p>
              <p className={`text-2xl font-bold text-emerald-400`}>
                {rendite.gesamtrenditeJahr1.toFixed(0)}%
              </p>
              <p className="text-xs text-slate-400 mt-1">inkl. Wertsteigerung</p>
            </div>
          )}
          <div className="bg-slate-800 p-4 rounded-lg text-center">
            <p className="text-slate-400 text-xs uppercase mb-1">Monatl. Cashflow</p>
            <p className={`text-2xl font-bold ${rendite.monthlyCashflow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              <Money value={rendite.monthlyCashflow} privacy={privacy} sign />
            </p>
          </div>
          <div className="bg-slate-800 p-4 rounded-lg text-center">
            <p className="text-slate-400 text-xs uppercase mb-1">Mietmultiplikator</p>
            <p className={`text-xl font-bold ${rendite.mietmultiplikator <= 20 ? 'text-emerald-400' : rendite.mietmultiplikator <= 25 ? 'text-amber-400' : 'text-red-400'}`}>
              {rendite.mietmultiplikator.toFixed(1)}x
            </p>
            <p className="text-xs text-slate-500 mt-1">{"<"}20 = gut</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-lg text-center">
            <p className="text-slate-400 text-xs uppercase mb-1">Break-Even Miete</p>
            <p className="text-xl font-bold text-white">
              <Money value={rendite.breakEvenRent} privacy={privacy} />
            </p>
          </div>
        </div>
      </Card>

      {/* Laufzeitenvergleich */}
      <Card>
        <h4 className="text-lg font-semibold text-white mb-4">Laufzeitenvergleich</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-sm border-b border-slate-700">
                <th className="py-3 px-2">Laufzeit</th>
                <th className="py-3 px-2 text-right">Tilgung</th>
                <th className="py-3 px-2 text-right">Monatl. Rate</th>
                <th className="py-3 px-2 text-right">Gesamtzinsen</th>
                <th className="py-3 px-2 text-right">Gesamtkosten</th>
              </tr>
            </thead>
            <tbody>
              {finanzierungsVergleich.map(f => (
                <tr key={f.years} className={`border-b border-slate-800 ${f.years === Math.round(100/tilgung) ? 'bg-emerald-500/10' : ''}`}>
                  <td className="py-3 px-2 text-white font-medium">{f.years} Jahre</td>
                  <td className="py-3 px-2 text-right text-slate-300">{f.tilgung.toFixed(1)}%</td>
                  <td className="py-3 px-2 text-right text-white"><Money value={f.monthlyRate} privacy={privacy} /></td>
                  <td className="py-3 px-2 text-right text-red-400"><Money value={f.totalInterest} privacy={privacy} /></td>
                  <td className="py-3 px-2 text-right text-white font-semibold"><Money value={f.totalCost} privacy={privacy} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ===================== RISK ANALYZER =====================

const RiskAnalyzer: React.FC<{
  properties: RealEstateProperty[];
  privacy: boolean;
}> = ({ properties, privacy }) => {
  // Stress test parameters
  const [interestShock, setInterestShock] = useState(2); // +2% interest
  const [vacancyMonths, setVacancyMonths] = useState(2); // 2 months/year
  const [valueDropPercent, setValueDropPercent] = useState(20); // -20% value
  const [showWorstCase, setShowWorstCase] = useState(false);

  // Current portfolio totals
  const currentTotals = useMemo(() => {
    return properties.reduce((acc, p) => {
      acc.totalValue += p.currentValue;
      acc.totalDebt += p.loanAmount;
      acc.monthlyPayment += p.monthlyPayment;
      acc.monthlyRent += p.isRented ? p.monthlyRent : 0;
      acc.monthlyExpenses += p.monthlyTaxes + p.monthlyInsurance + p.monthlyMaintenance + p.monthlyHOA;
      return acc;
    }, { totalValue: 0, totalDebt: 0, monthlyPayment: 0, monthlyRent: 0, monthlyExpenses: 0 });
  }, [properties]);

  // Stress test calculations
  const stressTests = useMemo(() => {
    // Interest rate shock
    const interestStress = properties.map(p => {
      const newRate = p.interestRate + interestShock;
      const newMonthlyInterest = p.loanAmount * (newRate / 100 / 12);
      const newPayment = newMonthlyInterest + p.monthlyPrincipal;
      const paymentIncrease = newPayment - p.monthlyPayment;
      return { name: p.name, oldPayment: p.monthlyPayment, newPayment, increase: paymentIncrease };
    });
    const totalInterestIncrease = interestStress.reduce((sum, s) => sum + s.increase, 0);

    // Vacancy stress
    const vacancyFactor = (12 - vacancyMonths) / 12;
    const adjustedRent = currentTotals.monthlyRent * vacancyFactor;
    const rentLoss = currentTotals.monthlyRent - adjustedRent;

    // Value drop
    const newValue = currentTotals.totalValue * (1 - valueDropPercent / 100);
    const newEquity = newValue - currentTotals.totalDebt;
    const newLTV = (currentTotals.totalDebt / newValue) * 100;

    // Current cashflow
    const currentCashflow = currentTotals.monthlyRent - currentTotals.monthlyExpenses - currentTotals.monthlyPayment;

    // Stressed cashflow (worst case)
    const worstCaseCashflow = adjustedRent - currentTotals.monthlyExpenses - (currentTotals.monthlyPayment + totalInterestIncrease);

    return {
      interestStress,
      totalInterestIncrease,
      adjustedRent,
      rentLoss,
      newValue,
      newEquity,
      newLTV,
      currentCashflow,
      worstCaseCashflow,
    };
  }, [properties, currentTotals, interestShock, vacancyMonths, valueDropPercent]);

  // Risk score calculation
  const riskScore = useMemo(() => {
    let score = 0;
    const currentLTV = (currentTotals.totalDebt / currentTotals.totalValue) * 100;
    
    // LTV risk
    if (currentLTV > 90) score += 30;
    else if (currentLTV > 80) score += 20;
    else if (currentLTV > 60) score += 10;
    
    // Cashflow risk
    const cashflowRatio = stressTests.currentCashflow / currentTotals.monthlyPayment;
    if (cashflowRatio < 0) score += 30;
    else if (cashflowRatio < 0.2) score += 20;
    else if (cashflowRatio < 0.5) score += 10;
    
    // Interest rate sensitivity
    const interestImpact = stressTests.totalInterestIncrease / currentTotals.monthlyPayment;
    if (interestImpact > 0.5) score += 20;
    else if (interestImpact > 0.3) score += 15;
    else if (interestImpact > 0.2) score += 10;
    
    // Concentration risk
    if (properties.length === 1) score += 10;
    
    return Math.min(100, score);
  }, [currentTotals, stressTests, properties.length]);

  const getRiskLevel = (score: number) => {
    if (score >= 60) return { text: 'Hoch', color: 'text-red-400', bg: 'bg-red-500' };
    if (score >= 30) return { text: 'Mittel', color: 'text-amber-400', bg: 'bg-amber-500' };
    return { text: 'Niedrig', color: 'text-emerald-400', bg: 'bg-emerald-500' };
  };

  const risk = getRiskLevel(riskScore);

  // Chart data for stress scenarios
  const scenarioData = [
    { name: 'Aktuell', cashflow: stressTests.currentCashflow, equity: currentTotals.totalValue - currentTotals.totalDebt },
    { name: `+${interestShock}% Zins`, cashflow: stressTests.currentCashflow - stressTests.totalInterestIncrease, equity: currentTotals.totalValue - currentTotals.totalDebt },
    { name: `${vacancyMonths}Mo Leerstand`, cashflow: stressTests.currentCashflow - stressTests.rentLoss, equity: currentTotals.totalValue - currentTotals.totalDebt },
    { name: `-${valueDropPercent}% Wert`, cashflow: stressTests.currentCashflow, equity: stressTests.newEquity },
    { name: 'Worst Case', cashflow: stressTests.worstCaseCashflow, equity: stressTests.newEquity },
  ];

  if (properties.length === 0) {
    return (
      <Card className="text-center py-12">
        <AlertTriangle size={48} className="mx-auto text-slate-600 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Keine Immobilien</h3>
        <p className="text-slate-400">Füge Immobilien hinzu, um Risiken zu analysieren.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
          <AlertTriangle size={24} className="text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Risiko-Analyse</h3>
          <p className="text-slate-400 text-sm">Stress-Tests & Portfolio-Bewertung</p>
        </div>
      </div>

      {/* Risk Score */}
      <Card className="bg-gradient-to-r from-slate-900 to-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-white mb-2">Risiko-Score</h4>
            <p className="text-slate-400 text-sm">Basierend auf LTV, Cashflow, Zinssensitivität</p>
          </div>
          <div className="text-right">
            <div className={`text-5xl font-bold ${risk.color}`}>{riskScore}</div>
            <Badge className={`${risk.bg} text-white`}>{risk.text}</Badge>
          </div>
        </div>
        <div className="mt-4 h-3 bg-slate-700 rounded-full overflow-hidden">
          <div className={`h-full ${risk.bg} transition-all duration-500`} style={{ width: `${riskScore}%` }} />
        </div>
      </Card>

      {/* Stress Test Controls */}
      <Card>
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <SlidersHorizontal size={18} className="text-amber-400" /> Stress-Test Parameter
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Zinsanstieg bei Anschlussfinanzierung: <span className="text-amber-400 font-medium">+{interestShock}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={interestShock}
              onChange={(e) => setInterestShock(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Leerstand pro Jahr: <span className="text-red-400 font-medium">{vacancyMonths} Monate</span>
            </label>
            <input
              type="range"
              min="0"
              max="6"
              step="1"
              value={vacancyMonths}
              onChange={(e) => setVacancyMonths(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Wertverlust: <span className="text-purple-400 font-medium">-{valueDropPercent}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="40"
              step="5"
              value={valueDropPercent}
              onChange={(e) => setValueDropPercent(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>
        </div>
      </Card>

      {/* Stress Test Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="text-center">
          <Shield size={24} className="mx-auto mb-2 text-blue-400" />
          <p className="text-slate-400 text-xs uppercase mb-1">Aktueller LTV</p>
          <p className={`text-2xl font-bold ${(currentTotals.totalDebt / currentTotals.totalValue * 100) > 80 ? 'text-red-400' : 'text-white'}`}>
            {((currentTotals.totalDebt / currentTotals.totalValue) * 100).toFixed(1)}%
          </p>
        </Card>
        <Card className="text-center">
          <TrendingDown size={24} className="mx-auto mb-2 text-purple-400" />
          <p className="text-slate-400 text-xs uppercase mb-1">LTV bei -{valueDropPercent}% Wert</p>
          <p className={`text-2xl font-bold ${stressTests.newLTV > 100 ? 'text-red-400' : stressTests.newLTV > 80 ? 'text-amber-400' : 'text-white'}`}>
            {stressTests.newLTV.toFixed(1)}%
          </p>
        </Card>
        <Card className="text-center">
          <Percent size={24} className="mx-auto mb-2 text-amber-400" />
          <p className="text-slate-400 text-xs uppercase mb-1">Rate bei +{interestShock}% Zins</p>
          <p className="text-2xl font-bold text-amber-400">
            +<Money value={stressTests.totalInterestIncrease} privacy={privacy} />
          </p>
        </Card>
        <Card className="text-center">
          <Wallet size={24} className="mx-auto mb-2 text-red-400" />
          <p className="text-slate-400 text-xs uppercase mb-1">Worst-Case Cashflow</p>
          <p className={`text-2xl font-bold ${stressTests.worstCaseCashflow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            <Money value={stressTests.worstCaseCashflow} privacy={privacy} sign />
          </p>
        </Card>
      </div>

      {/* Scenario Chart */}
      <Card>
        <h4 className="text-lg font-semibold text-white mb-4">Szenario-Vergleich</h4>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scenarioData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => privacy ? '' : `€${val/1000}k`} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                formatter={(val: number, name: string) => [privacy ? '****' : `€${val.toLocaleString()}`, name === 'cashflow' ? 'Monatl. Cashflow' : 'Eigenkapital']}
              />
              <Legend />
              <Bar name="Monatl. Cashflow" dataKey="cashflow" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Interest Stress by Property */}
      <Card>
        <h4 className="text-lg font-semibold text-white mb-4">Zinsrisiko pro Immobilie (+{interestShock}%)</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-sm border-b border-slate-700">
                <th className="py-3 px-2">Immobilie</th>
                <th className="py-3 px-2 text-right">Aktuelle Rate</th>
                <th className="py-3 px-2 text-right">Neue Rate</th>
                <th className="py-3 px-2 text-right">Mehrbelastung</th>
              </tr>
            </thead>
            <tbody>
              {stressTests.interestStress.map((s, i) => (
                <tr key={i} className="border-b border-slate-800">
                  <td className="py-3 px-2 text-white font-medium">{s.name}</td>
                  <td className="py-3 px-2 text-right text-slate-300"><Money value={s.oldPayment} privacy={privacy} /></td>
                  <td className="py-3 px-2 text-right text-amber-400"><Money value={s.newPayment} privacy={privacy} /></td>
                  <td className="py-3 px-2 text-right text-red-400">+<Money value={s.increase} privacy={privacy} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Portfolio Diversification */}
      <Card>
        <h4 className="text-lg font-semibold text-white mb-4">Portfolio-Diversifikation</h4>
        {properties.length === 1 ? (
          <div className="flex items-center gap-3 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <AlertTriangle className="text-amber-400" size={24} />
            <div>
              <p className="text-amber-400 font-medium">Klumpenrisiko</p>
              <p className="text-slate-400 text-sm">Nur eine Immobilie im Portfolio. Diversifikation durch weitere Objekte erhöht die Stabilität.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {properties.map(p => {
              const share = (p.currentValue / currentTotals.totalValue) * 100;
              return (
                <div key={p.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{p.name}</p>
                    <p className="text-slate-400 text-sm">{p.address}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{share.toFixed(1)}%</p>
                    <p className="text-slate-400 text-sm"><Money value={p.currentValue} privacy={privacy} /></p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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

  // Costs state
  const [costs, setCosts] = useState<BusinessPlanCost[]>(DEFAULT_BP_COSTS);
  const [nebenkostenPercent, setNebenkostenPercent] = useState(12); // 10-15%
  const [baukostenzuschuss, setBaukostenzuschuss] = useState(0); // Zuschuss von BEG, KfW etc.

  // Units state
  const [units, setUnits] = useState<UnitConfig[]>(DEFAULT_UNITS);

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

  // Toggle section
  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Update cost
  const updateCost = (id: string, amount: number) => {
    setCosts(prev => prev.map(c => c.id === id ? { ...c, amount } : c));
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
    const nebenkosten = baseCosts * (nebenkostenPercent / 100);
    const totalCostsBase = baseCosts + nebenkosten;
    const totalCostsWithOverrun = totalCostsBase * (1 + costOverrun / 100);
    // Kosten nach Abzug des Baukostenzuschusses
    const totalCostsNetto = Math.max(0, totalCostsWithOverrun - baukostenzuschuss);

    // Units analysis
    const ownedUnits = units.filter(u => u.isOwned);
    const otherUnits = units.filter(u => !u.isOwned);
    const totalMonthlyRent = ownedUnits.reduce((sum, u) => sum + u.monthlyRent, 0);
    const totalMarketValue = ownedUnits.reduce((sum, u) => sum + u.marketValue, 0);
    const totalSize = ownedUnits.reduce((sum, u) => sum + u.size, 0);

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
  }, [costs, nebenkostenPercent, costOverrun, baukostenzuschuss, units, eigenkapital, zinssatz, tilgung, zinsbindung, vacancyMonths, futureInterestIncrease, bewirtschaftungskostenPercent]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <FileText size={24} className="text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Businessplan Mehrfamilienhaus</h2>
          <p className="text-slate-400 text-sm">Interaktive Kalkulation für Ihr Bauprojekt</p>
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

            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-4">
                <span className="text-slate-400">Nebenkosten:</span>
                <input
                  type="range"
                  min="8"
                  max="18"
                  step="1"
                  value={nebenkostenPercent}
                  onChange={(e) => setNebenkostenPercent(Number(e.target.value))}
                  className="w-32 accent-amber-500"
                />
                <span className="text-amber-400 font-medium">{nebenkostenPercent}%</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-sm">= </span>
                <span className="text-amber-400 font-bold"><Money value={calculations.nebenkosten} privacy={privacy} fractionDigits={0} /></span>
              </div>
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="p-4 bg-slate-800 rounded-lg">
                <p className="text-slate-400 text-sm">Baukosten (Basis)</p>
                <p className="text-2xl font-bold text-white"><Money value={calculations.baseCosts} privacy={privacy} fractionDigits={0} /></p>
              </div>
              <div className="p-4 bg-slate-800 rounded-lg">
                <p className="text-slate-400 text-sm">+ Nebenkosten ({nebenkostenPercent}%)</p>
                <p className="text-2xl font-bold text-amber-400"><Money value={calculations.nebenkosten} privacy={privacy} fractionDigits={0} /></p>
              </div>
              {calculations.baukostenzuschuss > 0 && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <p className="text-emerald-300 text-sm">- Baukostenzuschuss</p>
                  <p className="text-2xl font-bold text-emerald-400">-<Money value={calculations.baukostenzuschuss} privacy={privacy} fractionDigits={0} /></p>
                </div>
              )}
              <div className={`p-4 rounded-lg ${calculations.baukostenzuschuss > 0 ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-amber-500/10 border border-amber-500/30'}`}>
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
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 text-sm border-b border-slate-700">
                    <th className="py-2 px-2">Einheit</th>
                    <th className="py-2 px-2 text-center">m²</th>
                    <th className="py-2 px-2 text-center">Miete/Mo (€)</th>
                    <th className="py-2 px-2 text-center">Marktwert (€)</th>
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
                        <Input
                          type="number"
                          value={unit.marketValue}
                          onChange={(e) => updateUnit(unit.id, 'marketValue', Number(e.target.value))}
                          className="w-28 text-center"
                        />
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Eigenkapital (€)</label>
                <Input
                  type="number"
                  value={eigenkapital}
                  onChange={(e) => setEigenkapital(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Zinssatz (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={zinssatz}
                  onChange={(e) => setZinssatz(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Tilgung (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={tilgung}
                  onChange={(e) => setTilgung(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Zinsbindung (Jahre)</label>
                <Input
                  type="number"
                  value={zinsbindung}
                  onChange={(e) => setZinsbindung(Number(e.target.value))}
                />
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

export default RealEstate;

