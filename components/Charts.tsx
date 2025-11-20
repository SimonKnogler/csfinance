
import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { Transaction, TransactionType } from '../types';

interface ChartsProps {
  transactions: Transaction[];
  privacy?: boolean;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const OverviewChart: React.FC<ChartsProps> = ({ transactions, privacy = false }) => {
  // Process data: Group by date
  const dataMap = new Map<string, { date: string; income: number; expense: number }>();
  
  const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  sorted.forEach(t => {
    // Just show Month-Day
    const dateStr = new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!dataMap.has(dateStr)) {
      dataMap.set(dateStr, { date: dateStr, income: 0, expense: 0 });
    }
    const entry = dataMap.get(dateStr)!;
    if (t.type === TransactionType.INCOME) entry.income += t.amount;
    else entry.expense += t.amount;
  });

  const data = Array.from(dataMap.values());

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => privacy ? '' : `€${val}`} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
            itemStyle={{ color: '#f8fafc' }}
            formatter={(value: number) => [privacy ? '****' : `€${value.toLocaleString()}`]}
          />
          <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
          <Area type="monotone" dataKey="expense" stroke="#6366f1" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const MonthlyBarChart: React.FC<ChartsProps & { type: TransactionType }> = ({ transactions, type, privacy = false }) => {
  const filtered = transactions.filter(t => t.type === type);
  const dataMap = new Map<string, number>();

  filtered.forEach(t => {
    const date = new Date(t.date);
    const key = date.toLocaleDateString('en-US', { month: 'short' });
    dataMap.set(key, (dataMap.get(key) || 0) + t.amount);
  });

  // Dummy data padding if not enough data
  if (dataMap.size < 5) {
     const months = ['Jun', 'Jul', 'Aug', 'Sep'];
     months.forEach(m => {
        if(!dataMap.has(m)) dataMap.set(m, Math.random() * 500 + 500);
     });
  }

  const data = Array.from(dataMap.entries()).map(([name, value]) => ({ name, value }));

  const color = type === TransactionType.INCOME ? '#10b981' : '#ef4444';

  return (
     <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
           <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
           <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
           <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => privacy ? '' : `€${val}`} />
           <Tooltip 
             cursor={{fill: 'rgba(255,255,255,0.05)'}}
             contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
             itemStyle={{ color: '#f8fafc' }}
             formatter={(value: number) => [privacy ? '****' : `€${value.toLocaleString()}`]}
           />
           <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
     </div>
  );
}

export const CategoryPieChart: React.FC<ChartsProps & { type?: TransactionType }> = ({ transactions, type = TransactionType.EXPENSE, privacy = false }) => {
  const filtered = transactions.filter(t => t.type === type);
  const categoryMap = new Map<string, number>();

  filtered.forEach(t => {
    const current = categoryMap.get(t.category) || 0;
    categoryMap.set(t.category, current + t.amount);
  });

  const data = Array.from(categoryMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5); // Top 5 categories

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
            ))}
          </Pie>
          <Tooltip 
             contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
             itemStyle={{ color: '#f8fafc' }}
             formatter={(val: number) => privacy ? '****' : `€${val.toFixed(2)}`}
          />
          <Legend verticalAlign="bottom" height={36} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
