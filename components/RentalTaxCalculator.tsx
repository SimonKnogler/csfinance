import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calculator, 
  Home, 
  Euro, 
  Percent, 
  TrendingDown,
  Building2,
  Receipt,
  PiggyBank
} from 'lucide-react';
import { RealEstateProperty } from '../types';
import { StorageService } from '../services/storageService';
import { Card, Button, Input, Money } from './UIComponents';

interface RentalTaxCalculatorProps {
  privacy: boolean;
}

// German income tax brackets 2024
const TAX_BRACKETS = [
  { min: 0, max: 11604, rate: 0 },           // Grundfreibetrag
  { min: 11604, max: 17005, rate: 0.14 },    // Zone 1 (progressive)
  { min: 17005, max: 66760, rate: 0.24 },    // Zone 2 (progressive, simplified)
  { min: 66760, max: 277825, rate: 0.42 },   // Proportional zone
  { min: 277825, max: Infinity, rate: 0.45 }, // Reichensteuer
];

// Simplified marginal tax rate calculation
function calculateMarginalTaxRate(totalIncome: number): number {
  if (totalIncome <= 11604) return 0;
  if (totalIncome <= 17005) return 0.14 + ((totalIncome - 11604) / (17005 - 11604)) * 0.10;
  if (totalIncome <= 66760) return 0.24 + ((totalIncome - 17005) / (66760 - 17005)) * 0.18;
  if (totalIncome <= 277825) return 0.42;
  return 0.45;
}

export const RentalTaxCalculator: React.FC<RentalTaxCalculatorProps> = ({ privacy }) => {
  const [properties, setProperties] = useState<RealEstateProperty[]>([]);
  const [annualSalary, setAnnualSalary] = useState(60000); // User's other income for tax bracket
  const [landValuePercent, setLandValuePercent] = useState(20); // % of purchase price that is land (not depreciable)
  const [managementCosts, setManagementCosts] = useState(0); // Hausverwaltung per property
  const [additionalDeductions, setAdditionalDeductions] = useState(0); // Other Werbungskosten

  useEffect(() => {
    const load = async () => {
      const data = await StorageService.getRealEstate();
      setProperties(data.filter(p => p.isRented));
    };
    load();
  }, []);

  const calculations = useMemo(() => {
    // Only consider rented properties
    const rentedProperties = properties.filter(p => p.isRented);
    
    if (rentedProperties.length === 0) {
      return {
        grossRent: 0,
        totalDeductions: 0,
        afa: 0,
        interestDeduction: 0,
        operatingCosts: 0,
        taxableIncome: 0,
        marginalRate: calculateMarginalTaxRate(annualSalary),
        taxOnRent: 0,
        netRent: 0,
        properties: [],
      };
    }

    let totalGrossRent = 0;
    let totalAfa = 0;
    let totalInterest = 0;
    let totalOperating = 0;

    const propertyDetails = rentedProperties.map(p => {
      const annualRent = p.monthlyRent * 12;
      
      // AfA: 2% of building value (purchase price - land value)
      const buildingValue = p.purchasePrice * (1 - landValuePercent / 100);
      const afa = buildingValue * 0.02;
      
      // Interest is fully deductible
      const annualInterest = p.monthlyInterest * 12;
      
      // Operating costs that are deductible
      const operatingCosts = (
        p.monthlyTaxes +        // Grundsteuer
        p.monthlyInsurance +    // Versicherungen
        p.monthlyMaintenance +  // Instandhaltungsrücklage
        p.monthlyHOA +          // Hausgeld (nicht umlagefähig)
        managementCosts         // Hausverwaltung
      ) * 12;

      totalGrossRent += annualRent;
      totalAfa += afa;
      totalInterest += annualInterest;
      totalOperating += operatingCosts;

      const deductions = afa + annualInterest + operatingCosts;
      const taxable = Math.max(0, annualRent - deductions);

      return {
        id: p.id,
        name: p.name,
        annualRent,
        afa,
        annualInterest,
        operatingCosts,
        deductions,
        taxable,
      };
    });

    const totalDeductions = totalAfa + totalInterest + totalOperating + additionalDeductions;
    const taxableRentalIncome = Math.max(0, totalGrossRent - totalDeductions);
    
    // Calculate marginal tax rate based on total income
    const totalIncome = annualSalary + taxableRentalIncome;
    const marginalRate = calculateMarginalTaxRate(totalIncome);
    
    // Tax on rental income at marginal rate
    const taxOnRent = taxableRentalIncome * marginalRate;
    
    // Net rent after tax
    const netRent = totalGrossRent - totalDeductions - taxOnRent;

    return {
      grossRent: totalGrossRent,
      totalDeductions,
      afa: totalAfa,
      interestDeduction: totalInterest,
      operatingCosts: totalOperating + additionalDeductions,
      taxableIncome: taxableRentalIncome,
      marginalRate,
      taxOnRent,
      netRent,
      properties: propertyDetails,
    };
  }, [properties, annualSalary, landValuePercent, managementCosts, additionalDeductions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Calculator size={24} className="text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Mieteinnahmen Steuerrechner</h2>
          <p className="text-slate-400 text-sm">Deutsche Einkommenssteuer auf Vermietung</p>
        </div>
      </div>

      {/* Settings Card */}
      <Card>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Receipt size={18} /> Steuereinstellungen
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Jahresgehalt (anderes Einkommen)</label>
            <Input
              type="number"
              value={annualSalary}
              onChange={(e) => setAnnualSalary(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-slate-500 mt-1">Für Grenzsteuersatz</p>
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Grundstücksanteil (%)</label>
            <Input
              type="number"
              value={landValuePercent}
              onChange={(e) => setLandValuePercent(Number(e.target.value))}
              min={0}
              max={50}
              className="w-full"
            />
            <p className="text-xs text-slate-500 mt-1">Nicht AfA-fähig (typ. 15-25%)</p>
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Hausverwaltung (€/Monat)</label>
            <Input
              type="number"
              value={managementCosts}
              onChange={(e) => setManagementCosts(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Sonstige Werbungskosten (€/Jahr)</label>
            <Input
              type="number"
              value={additionalDeductions}
              onChange={(e) => setAdditionalDeductions(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-slate-500 mt-1">Fahrtkosten, Büro, etc.</p>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <Euro size={16} /> Brutto-Mieteinnahmen
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            <Money value={calculations.grossRent} privacy={privacy} /> /Jahr
          </div>
          <div className="text-sm text-slate-500 mt-1">
            <Money value={calculations.grossRent / 12} privacy={privacy} /> /Monat
          </div>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <TrendingDown size={16} /> Abzugsfähige Kosten
          </div>
          <div className="text-2xl font-bold text-amber-400">
            <Money value={calculations.totalDeductions} privacy={privacy} /> /Jahr
          </div>
          <div className="text-xs text-slate-500 mt-1 space-y-0.5">
            <div>AfA: <Money value={calculations.afa} privacy={privacy} /></div>
            <div>Zinsen: <Money value={calculations.interestDeduction} privacy={privacy} /></div>
            <div>Betrieb: <Money value={calculations.operatingCosts} privacy={privacy} /></div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <Percent size={16} /> Steuer auf Miete
          </div>
          <div className="text-2xl font-bold text-red-400">
            <Money value={calculations.taxOnRent} privacy={privacy} /> /Jahr
          </div>
          <div className="text-xs text-slate-500 mt-1">
            <div>Zu versteuern: <Money value={calculations.taxableIncome} privacy={privacy} /></div>
            <div>Grenzsteuersatz: {(calculations.marginalRate * 100).toFixed(1)}%</div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <PiggyBank size={16} /> Netto nach Steuer
          </div>
          <div className="text-2xl font-bold text-blue-400">
            <Money value={calculations.netRent} privacy={privacy} /> /Jahr
          </div>
          <div className="text-sm text-slate-500 mt-1">
            <Money value={calculations.netRent / 12} privacy={privacy} /> /Monat
          </div>
        </Card>
      </div>

      {/* Property Breakdown */}
      {calculations.properties.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Building2 size={18} /> Aufschlüsselung nach Immobilie
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700">
                  <th className="text-left py-3 px-2">Immobilie</th>
                  <th className="text-right py-3 px-2">Brutto-Miete</th>
                  <th className="text-right py-3 px-2">AfA</th>
                  <th className="text-right py-3 px-2">Zinsen</th>
                  <th className="text-right py-3 px-2">Betriebskosten</th>
                  <th className="text-right py-3 px-2">Zu versteuern</th>
                </tr>
              </thead>
              <tbody>
                {calculations.properties.map(prop => (
                  <tr key={prop.id} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                    <td className="py-3 px-2 text-white font-medium">{prop.name}</td>
                    <td className="py-3 px-2 text-right text-emerald-400">
                      <Money value={prop.annualRent} privacy={privacy} />
                    </td>
                    <td className="py-3 px-2 text-right text-amber-400">
                      <Money value={prop.afa} privacy={privacy} />
                    </td>
                    <td className="py-3 px-2 text-right text-amber-400">
                      <Money value={prop.annualInterest} privacy={privacy} />
                    </td>
                    <td className="py-3 px-2 text-right text-amber-400">
                      <Money value={prop.operatingCosts} privacy={privacy} />
                    </td>
                    <td className="py-3 px-2 text-right text-white font-medium">
                      <Money value={prop.taxable} privacy={privacy} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-800/50 font-semibold">
                  <td className="py-3 px-2 text-white">Gesamt</td>
                  <td className="py-3 px-2 text-right text-emerald-400">
                    <Money value={calculations.grossRent} privacy={privacy} />
                  </td>
                  <td className="py-3 px-2 text-right text-amber-400">
                    <Money value={calculations.afa} privacy={privacy} />
                  </td>
                  <td className="py-3 px-2 text-right text-amber-400">
                    <Money value={calculations.interestDeduction} privacy={privacy} />
                  </td>
                  <td className="py-3 px-2 text-right text-amber-400">
                    <Money value={calculations.operatingCosts} privacy={privacy} />
                  </td>
                  <td className="py-3 px-2 text-right text-white">
                    <Money value={calculations.taxableIncome} privacy={privacy} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* Info Box */}
      <Card className="bg-slate-800/50 border border-slate-700">
        <h4 className="text-sm font-semibold text-white mb-2">Hinweise zur Berechnung</h4>
        <ul className="text-xs text-slate-400 space-y-1">
          <li>• <strong>AfA (Absetzung für Abnutzung):</strong> 2% linear auf den Gebäudeanteil (Kaufpreis minus Grundstücksanteil)</li>
          <li>• <strong>Werbungskosten:</strong> Zinsen, Grundsteuer, Versicherungen, Hausverwaltung, Instandhaltung sind voll abzugsfähig</li>
          <li>• <strong>Grenzsteuersatz:</strong> Basiert auf Gesamteinkommen (Gehalt + Mieteinnahmen nach Abzügen)</li>
          <li>• <strong>Hinweis:</strong> Diese Berechnung ist vereinfacht. Für genaue Steuererklärung einen Steuerberater konsultieren.</li>
        </ul>
      </Card>

      {properties.length === 0 && (
        <Card className="text-center py-12">
          <Home size={48} className="mx-auto text-slate-600 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Keine vermieteten Immobilien</h3>
          <p className="text-slate-400">
            Füge Immobilien mit aktivierter Vermietung in der Immobilien-Sektion hinzu, um die Steuerberechnung zu sehen.
          </p>
        </Card>
      )}
    </div>
  );
};

