
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
  ChevronUp
} from 'lucide-react';
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
  Cell
} from 'recharts';
import { RealEstateProperty, PortfolioOwner } from '../types';
import { StorageService } from '../services/storageService';
import { Card, Button, Input, Select, Badge, Money } from './UIComponents';

interface RealEstateProps {
  privacy: boolean;
}

export const RealEstate: React.FC<RealEstateProps> = ({ privacy }) => {
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
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus size={18} /> Immobilie hinzufügen
        </Button>
      </div>

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

export default RealEstate;

