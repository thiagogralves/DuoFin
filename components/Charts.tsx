import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Transaction } from '../types';
import { formatCurrency } from './UI';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

interface ChartsProps {
  transactions?: Transaction[];
  data?: any[];
  hidden?: boolean;
}

export const MonthlyChart = ({ transactions = [], hidden = false }: ChartsProps) => {
  // Aggregate data by month
  const data = React.useMemo(() => {
    const monthlyData: Record<string, { name: string; Receitas: number; Despesas: number }> = {};
    
    transactions.forEach(t => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      const monthLabel = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { name: monthLabel, Receitas: 0, Despesas: 0 };
      }

      if (t.type === 'receita') {
        monthlyData[monthKey].Receitas += t.amount;
      } else {
        monthlyData[monthKey].Despesas += t.amount;
      }
    });

    return Object.keys(monthlyData)
      .sort() // Works for YYYY-MM
      .map(key => monthlyData[key]);
  }, [transactions]);

  if (data.length === 0) return <div className="text-center text-slate-400 py-10">Sem dados suficientes</div>;

  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
          <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis 
            stroke="#64748b" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(val) => hidden ? '••••' : new Intl.NumberFormat('pt-BR', { notation: 'compact', compactDisplay: 'short', style: 'currency', currency: 'BRL' }).format(val)} 
          />
          <Tooltip 
            cursor={{ fill: 'transparent' }}
            formatter={(value: number) => formatCurrency(value, hidden)}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tooltip-bg, #fff)', color: 'var(--tooltip-color, #000)' }}
          />
          <Legend />
          <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const CategoryChart = ({ transactions = [], hidden = false }: ChartsProps) => {
  const data = React.useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'despesa');
    const catData: Record<string, number> = {};

    expenses.forEach(t => {
      catData[t.category] = (catData[t.category] || 0) + t.amount;
    });

    return Object.entries(catData)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6); // Top 6
  }, [transactions]);

  if (data.length === 0) return <div className="text-center text-slate-400 py-10">Sem despesas registradas</div>;

  return (
    <div className="h-60 w-full flex justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={65}
            paddingAngle={5}
            dataKey="value"
            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
            labelLine={true}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
             formatter={(value: number) => formatCurrency(value, hidden)}
             contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '11px', maxWidth: '40%' }}/>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const EvolutionChart = ({ data, hidden = false }: ChartsProps) => {
   if (!data || data.length === 0) return <div className="text-center text-slate-400 py-10">Histórico insuficiente</div>;
 
   return (
     <div className="h-60 w-full">
       <ResponsiveContainer width="100%" height="100%">
         <AreaChart
           data={data}
           margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
         >
           <defs>
             <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
               <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
               <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
             </linearGradient>
           </defs>
           <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
           <YAxis 
             stroke="#64748b" 
             fontSize={12} 
             tickLine={false} 
             axisLine={false} 
             tickFormatter={(val) => hidden ? '••••' : new Intl.NumberFormat('pt-BR', { notation: 'compact', compactDisplay: 'short', style: 'currency', currency: 'BRL' }).format(val)} 
           />
           <Tooltip 
             formatter={(value: number) => formatCurrency(value, hidden)}
             contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
           />
           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
           <Area type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorValue)" />
         </AreaChart>
       </ResponsiveContainer>
     </div>
   );
 };
