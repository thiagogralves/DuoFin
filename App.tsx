import React, { useState, useEffect, useMemo } from 'react';
import { 
  IconTrendingUp, IconTrendingDown, IconWallet, 
  IconPieChart, IconList, IconPlus, IconTrash, IconBrain, IconShield, IconSettings, IconCalendar, IconRefresh, IconTarget, IconClose, IconMenu, IconEdit, IconEye, IconEyeOff
} from './components/Icons';
import { Card, Button, Input, Select, formatCurrency, Modal, ProgressBar } from './components/UI';
import { MonthlyChart, CategoryChart } from './components/Charts';
import { Transaction, Investment, User, InvestmentType, TransactionType, Budget, Category } from './types';
import { USERS, CATEGORIES, APP_PASSWORD } from './constants';
import { getFinancialAdvice } from './services/geminiService';
import { supabase } from './services/supabase';

// --- Helper Functions ---
const getMonthLabel = (date: Date) => {
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

// --- Sub-components ---

// 1. Transactions List Component with Filters
const TransactionsPage = ({ 
  transactions, 
  onAdd, 
  onUpdate,
  onDelete,
  isLoading,
  categories,
  currentDate,
  onMonthChange,
  onGenerateRecurring,
  currentUser,
  hidden
}: { 
  transactions: Transaction[]; 
  onAdd: (t: Omit<Transaction, 'id'>) => void; 
  onUpdate: (id: string, t: Partial<Transaction>) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
  categories: Category[];
  currentDate: Date;
  onMonthChange: (d: Date) => void;
  onGenerateRecurring: () => void;
  currentUser: User;
  hidden: boolean;
}) => {
  const [form, setForm] = useState({
    description: '',
    amount: '',
    type: 'despesa' as TransactionType,
    category: '',
    date: new Date().toISOString().split('T')[0],
    is_recurring: false,
    recurring_months: ''
  });
  
  // Edit State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Set default category when type changes or categories load
  useEffect(() => {
    const catsOfType = categories.filter(c => c.type === form.type).map(c => c.name).sort();
    if (catsOfType.length > 0 && (!form.category || !catsOfType.includes(form.category))) {
       setForm(f => ({ ...f, category: catsOfType[0] }));
    }
  }, [form.type, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || !form.amount) return;

    onAdd({
      description: form.description,
      amount: Number(form.amount),
      type: form.type,
      category: form.category,
      user: currentUser, // Auto-assign current user
      date: form.date,
      is_recurring: form.is_recurring,
      recurring_months: form.is_recurring && form.recurring_months ? Number(form.recurring_months) : 0
    });
    setForm({ ...form, description: '', amount: '', is_recurring: false, recurring_months: '' });
  };
  
  const handleUpdateSubmit = () => {
     if (editingTransaction) {
        onUpdate(editingTransaction.id, {
           description: editingTransaction.description,
           amount: editingTransaction.amount,
           date: editingTransaction.date,
           category: editingTransaction.category,
           type: editingTransaction.type
        });
        setEditingTransaction(null);
     }
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as TransactionType;
    setForm({ ...form, type: newType });
  };

  const availableCategories = useMemo(() => {
    return categories
       .filter(c => c.type === form.type)
       .map(c => c.name)
       .sort();
  }, [form.type, categories]);
  
  const editAvailableCategories = useMemo(() => {
     if (!editingTransaction) return [];
     return categories
       .filter(c => c.type === editingTransaction.type)
       .map(c => c.name)
       .sort();
  }, [editingTransaction, categories]);

  // Filter Transactions by Selected Month AND Current User
  const filteredTransactions = transactions.filter(t => {
    const tDate = new Date(t.date);
    const dateMatch = tDate.getMonth() === currentDate.getMonth() && tDate.getFullYear() === currentDate.getFullYear();
    const userMatch = currentUser === 'Ambos' ? true : t.user === currentUser;
    return dateMatch && userMatch;
  });

  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <button onClick={() => onMonthChange(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-slate-100 rounded-full">
           &lt; Anterior
        </button>
        <h2 className="text-xl font-bold text-slate-800 capitalize flex items-center gap-2">
           <IconCalendar className="w-5 h-5 text-slate-500"/> {getMonthLabel(currentDate)}
        </h2>
        <button onClick={() => onMonthChange(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-slate-100 rounded-full">
           Próximo &gt;
        </button>
      </div>

      <div className="flex justify-end">
         <Button variant="secondary" onClick={onGenerateRecurring} className="text-sm">
            <IconRefresh className="w-4 h-4" /> Checar Recorrentes
         </Button>
      </div>

      {currentUser === 'Ambos' ? (
        <Card className="bg-slate-50 border-dashed border-2 border-slate-200 text-center py-8">
           <p className="text-slate-500 font-medium">Selecione o perfil de <span className="text-blue-600 font-bold">Thiago</span> ou <span className="text-pink-600 font-bold">Marcela</span> no topo da página para adicionar novas movimentações.</p>
        </Card>
      ) : (
        <Card className={`border-l-4 ${currentUser === 'Thiago' ? 'border-l-blue-500' : 'border-l-pink-500'}`}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <IconPlus className="w-5 h-5" /> Nova Movimentação ({currentUser})
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            <div className="lg:col-span-2">
              <Input 
                label="Descrição" 
                value={form.description} 
                onChange={e => setForm({...form, description: e.target.value})} 
                placeholder="Ex: Compra Mercado"
              />
            </div>
            <Input 
              label="Valor (R$)" 
              type="number" 
              value={form.amount} 
              onChange={e => setForm({...form, amount: e.target.value})} 
              placeholder="0,00"
            />
            <div className="flex flex-col gap-1 w-full">
              <label className="text-xs font-semibold uppercase text-slate-500">Data</label>
              <input 
                type="date" 
                value={form.date} 
                onChange={e => setForm({...form, date: e.target.value})}
                className="border border-slate-300 rounded-lg p-2 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none w-full"
              />
            </div>
            <div className="flex flex-col gap-1 w-full">
              <label className="text-xs font-semibold uppercase text-slate-500">Tipo</label>
              <select 
                value={form.type} 
                onChange={handleTypeChange}
                className="border border-slate-300 rounded-lg p-2 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none w-full"
              >
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
              </select>
            </div>
            <div className="flex items-end gap-2 lg:col-span-2">
              <div className="flex-1">
                <Select 
                  label="Categoria"
                  value={form.category}
                  onChange={e => setForm({...form, category: e.target.value})}
                  options={availableCategories}
                />
              </div>
            </div>
            
            <div className="lg:col-span-1 flex flex-col pt-1">
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input 
                    type="checkbox" 
                    checked={form.is_recurring} 
                    onChange={e => setForm({...form, is_recurring: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                  />
                  <span className="text-sm text-slate-700 font-medium">Recorrente?</span>
              </label>
              {form.is_recurring && (
                 <Input 
                    label="Por quantos meses?" 
                    type="number" 
                    placeholder="Ex: 12" 
                    value={form.recurring_months} 
                    onChange={e => setForm({...form, recurring_months: e.target.value})}
                 />
              )}
            </div>
            <div className="lg:col-span-4 flex justify-end mt-2">
              <Button disabled={isLoading} className="w-full md:w-auto px-8">
                {isLoading ? 'Salvando...' : 'Adicionar Movimentação'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="p-4">Data</th>
                <th className="p-4">Descrição</th>
                <th className="p-4">Quem</th>
                <th className="p-4">Categoria</th>
                <th className="p-4 text-right">Valor</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                <tr key={t.id} className="border-b hover:bg-slate-50">
                  <td className="p-4 whitespace-nowrap">
                    {new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    {t.is_recurring && (
                        <div className="flex flex-col mt-1">
                           <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1 rounded border border-indigo-200 w-fit">FIXA</span>
                           {t.recurring_months && t.recurring_months > 0 && (
                              <span className="text-[10px] text-slate-400 mt-0.5">{t.recurring_months} meses</span>
                           )}
                        </div>
                    )}
                  </td>
                  <td className="p-4 font-medium text-slate-800 whitespace-nowrap">{t.description}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${t.user === 'Thiago' ? 'bg-blue-100 text-blue-700' : t.user === 'Marcela' ? 'bg-pink-100 text-pink-700' : 'bg-purple-100 text-purple-700'}`}>
                      {t.user}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500 whitespace-nowrap">{t.category}</td>
                  <td className={`p-4 text-right font-bold whitespace-nowrap ${t.type === 'receita' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.type === 'receita' ? '+' : '-'} {formatCurrency(t.amount, hidden)}
                  </td>
                  <td className="p-4 text-center flex items-center justify-center gap-2">
                    <button onClick={() => setEditingTransaction(t)} disabled={isLoading} className="text-slate-400 hover:text-blue-500 transition-colors disabled:opacity-50">
                       <IconEdit className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(t.id)} disabled={isLoading} className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50">
                      <IconTrash className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Nenhuma transação encontrada neste mês para {currentUser === 'Ambos' ? 'Geral' : currentUser}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Transaction Modal */}
      <Modal isOpen={!!editingTransaction} onClose={() => setEditingTransaction(null)} title="Editar Transação">
         {editingTransaction && (
            <div className="space-y-4">
               <Input 
                  label="Descrição" 
                  value={editingTransaction.description} 
                  onChange={e => setEditingTransaction({...editingTransaction, description: e.target.value})} 
               />
               <Input 
                  label="Valor (R$)" 
                  type="number"
                  value={editingTransaction.amount} 
                  onChange={e => setEditingTransaction({...editingTransaction, amount: Number(e.target.value)})} 
               />
               <div className="flex flex-col gap-1 w-full">
                  <label className="text-xs font-semibold uppercase text-slate-500">Data</label>
                  <input 
                     type="date" 
                     value={editingTransaction.date} 
                     onChange={e => setEditingTransaction({...editingTransaction, date: e.target.value})}
                     className="border border-slate-300 rounded-lg p-2 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none w-full"
                  />
               </div>
               <Select 
                  label="Categoria"
                  value={editingTransaction.category}
                  onChange={e => setEditingTransaction({...editingTransaction, category: e.target.value})}
                  options={editAvailableCategories}
               />
               <Button onClick={handleUpdateSubmit} className="w-full">Salvar Alterações</Button>
            </div>
         )}
      </Modal>
    </div>
  );
};

// 2. Dashboard Component with Month Filter and Goals
const DashboardPage = ({ 
  transactions, 
  stats,
  budgets,
  onUpdateBudget,
  currentDate,
  onMonthChange,
  currentUser,
  hidden
}: { 
  transactions: Transaction[]; 
  stats: any;
  budgets: Budget[];
  onUpdateBudget: (cat: string, limit: number) => void;
  currentDate: Date;
  onMonthChange: (d: Date) => void;
  currentUser: User;
  hidden: boolean;
}) => {
  const [editingBudget, setEditingBudget] = useState<{cat: string, val: string} | null>(null);

  // Filter Transactions by Selected Month AND User
  const filteredTransactions = transactions.filter(t => {
    const tDate = new Date(t.date);
    const dateMatch = tDate.getMonth() === currentDate.getMonth() && tDate.getFullYear() === currentDate.getFullYear();
    const userMatch = currentUser === 'Ambos' ? true : t.user === currentUser;
    return dateMatch && userMatch;
  });
  
  // Calculate Stats for FILTERED transactions
  const monthlyStats = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'receita').reduce((acc, t) => acc + t.amount, 0);
    const expenses = filteredTransactions.filter(t => t.type === 'despesa').reduce((acc, t) => acc + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [filteredTransactions]);

  // Calculate spending per category for Budgets
  const spendingByCategory = useMemo(() => {
    const spending: Record<string, number> = {};
    filteredTransactions.filter(t => t.type === 'despesa').forEach(t => {
       spending[t.category] = (spending[t.category] || 0) + t.amount;
    });
    return spending;
  }, [filteredTransactions]);

  const handleBudgetSave = () => {
    if (editingBudget) {
      onUpdateBudget(editingBudget.cat, Number(editingBudget.val));
      setEditingBudget(null);
    }
  };

  return (
    <div className="space-y-6">
       {/* Month Selector */}
       <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6">
        <button onClick={() => onMonthChange(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-slate-100 rounded-full">
           &lt; Anterior
        </button>
        <h2 className="text-xl font-bold text-slate-800 capitalize flex items-center gap-2">
           <IconCalendar className="w-5 h-5 text-slate-500"/> {getMonthLabel(currentDate)}
        </h2>
        <button onClick={() => onMonthChange(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-slate-100 rounded-full">
           Próximo &gt;
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Saldo do Mês</p>
              <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(monthlyStats.balance, hidden)}</h3>
            </div>
            <div className="p-2 bg-emerald-100 rounded-full text-emerald-600">
                <IconWallet />
            </div>
          </div>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Receitas</p>
              <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(monthlyStats.income, hidden)}</h3>
            </div>
            <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                <IconTrendingUp />
            </div>
          </div>
        </Card>
        <Card className="border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Despesas</p>
              <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(monthlyStats.expenses, hidden)}</h3>
            </div>
            <div className="p-2 bg-rose-100 rounded-full text-rose-600">
                <IconTrendingDown />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-bold text-slate-800 mb-4">Fluxo Diário (Mês)</h3>
          <MonthlyChart transactions={filteredTransactions} hidden={hidden} />
        </Card>
        <Card>
          <h3 className="text-lg font-bold text-slate-800 mb-4">Gastos por Categoria</h3>
          <CategoryChart transactions={filteredTransactions} hidden={hidden} />
        </Card>
      </div>

      {/* Budgets / Metas Section */}
      <Card>
         <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
               <IconTarget className="w-5 h-5 text-indigo-500" /> Metas de Gastos (Orçamento)
            </h3>
            <button 
               className="text-sm text-blue-600 hover:underline"
               onClick={() => alert('Clique em uma categoria para definir o limite mensal.')}
            >
               Como funciona?
            </button>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {Object.keys(spendingByCategory).map(cat => {
               const budget = budgets.find(b => b.category === cat);
               const limit = budget ? budget.limit_amount : 0;
               return (
                  <div key={cat} className="cursor-pointer group" onClick={() => setEditingBudget({ cat, val: String(limit) })}>
                     {limit > 0 ? (
                        <ProgressBar 
                           label={cat} 
                           current={spendingByCategory[cat]} 
                           max={limit}
                           hidden={hidden} 
                        />
                     ) : (
                        <div className="flex justify-between items-center p-2 rounded hover:bg-slate-50 border border-transparent hover:border-slate-100 mb-2">
                           <span className="text-slate-700 font-medium">{cat}</span>
                           <span className="text-xs text-blue-500 opacity-0 group-hover:opacity-100">Definir Meta +</span>
                           <span className="text-slate-500 font-bold">{formatCurrency(spendingByCategory[cat], hidden)}</span>
                        </div>
                     )}
                  </div>
               );
            })}
            {Object.keys(spendingByCategory).length === 0 && (
               <p className="text-slate-400">Cadastre despesas neste mês para definir metas.</p>
            )}
         </div>
      </Card>

      <Modal isOpen={!!editingBudget} onClose={() => setEditingBudget(null)} title="Definir Meta de Gasto Mensal">
         <div className="space-y-4">
            <p className="text-sm text-slate-600">Categoria: <strong>{editingBudget?.cat}</strong></p>
            <Input 
               label="Limite Máximo (R$)" 
               type="number"
               value={editingBudget?.val || ''} 
               onChange={e => setEditingBudget(prev => prev ? {...prev, val: e.target.value} : null)}
            />
            <Button onClick={handleBudgetSave} className="w-full">Salvar Meta</Button>
         </div>
      </Modal>
      
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white flex justify-between items-center shadow-lg">
          <div>
            <h3 className="text-xl font-bold">Patrimônio Investido ({currentUser})</h3>
            <p className="opacity-80">Total Acumulado</p>
          </div>
          <div className="text-3xl font-bold text-emerald-400">
            {formatCurrency(stats.invested, hidden)}
          </div>
      </div>
    </div>
  );
};

// 3. Investments Page (Unchanged)
const InvestmentsPage = ({ 
  investments, 
  onAdd, 
  onDelete,
  isLoading,
  currentUser,
  hidden
}: { 
  investments: Investment[]; 
  onAdd: (i: Omit<Investment, 'id' | 'history'>, initialAmount: number) => void; 
  onDelete: (id: string) => void;
  isLoading: boolean;
  currentUser: User;
  hidden: boolean;
}) => {
  const [form, setForm] = useState({
    name: '',
    type: 'geral' as InvestmentType,
    amount: ''
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.amount) return;
    
    onAdd({
      name: form.name,
      type: form.type,
      currentAmount: 0,
      user: currentUser
    }, Number(form.amount));
    setForm({ ...form, name: '', amount: '' });
  };

  const filteredInvestments = investments.filter(i => 
    currentUser === 'Ambos' ? true : i.user === currentUser
  );

  const emergencyFund = filteredInvestments.filter(i => i.type === 'emergencia');
  const generalInvestments = filteredInvestments.filter(i => i.type === 'geral');

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none">
            <div className="flex items-center gap-3 mb-2 opacity-90">
              <IconShield className="w-6 h-6" />
              <h3 className="font-semibold text-lg">Reserva de Emergência</h3>
            </div>
            <p className="text-3xl font-bold">
              {formatCurrency(emergencyFund.reduce((acc, i) => acc + i.currentAmount, 0), hidden)}
            </p>
            <p className="text-sm opacity-75 mt-2">Proteção para imprevistos</p>
         </Card>
         <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-none">
            <div className="flex items-center gap-3 mb-2 opacity-90">
              <IconTrendingUp className="w-6 h-6" />
              <h3 className="font-semibold text-lg">Investimentos Gerais</h3>
            </div>
            <p className="text-3xl font-bold">
              {formatCurrency(generalInvestments.reduce((acc, i) => acc + i.currentAmount, 0), hidden)}
            </p>
            <p className="text-sm opacity-75 mt-2">Foco no longo prazo</p>
         </Card>
      </div>

      {/* Add Form */}
      {currentUser === 'Ambos' ? (
        <Card className="bg-slate-50 border-dashed border-2 border-slate-200 text-center py-8">
           <p className="text-slate-500 font-medium">Selecione o perfil de <span className="text-blue-600 font-bold">Thiago</span> ou <span className="text-pink-600 font-bold">Marcela</span> para adicionar investimentos.</p>
        </Card>
      ) : (
        <Card>
          <h3 className="font-bold text-slate-800 mb-4">Novo Investimento / Aplicação ({currentUser})</h3>
          <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <Input label="Nome" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ex: Tesouro Selic, CDB..." />
            </div>
            <div className="w-full md:w-32">
              <div className="flex flex-col gap-1 w-full">
                <label className="text-xs font-semibold uppercase text-slate-500">Tipo</label>
                <select 
                  value={form.type} 
                  onChange={e => setForm({...form, type: e.target.value as InvestmentType})}
                  className="border border-slate-300 rounded-lg p-2 bg-white text-slate-800 w-full outline-none"
                >
                  <option value="geral">Geral</option>
                  <option value="emergencia">Emergência</option>
                </select>
              </div>
            </div>
            <div className="w-full md:w-32">
              <Input label="Valor Inicial" type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="0,00" />
            </div>
            <Button disabled={isLoading} className="w-full md:w-auto">
              {isLoading ? 'Salvando...' : 'Criar'}
            </Button>
          </form>
        </Card>
      )}

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredInvestments.map(inv => (
          <Card key={inv.id} className="relative group hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <div className={`text-xs px-2 py-1 rounded-full ${inv.type === 'emergencia' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                {inv.type === 'emergencia' ? 'Emergência' : 'Investimento'}
              </div>
              <button onClick={() => onDelete(inv.id)} disabled={isLoading} className="text-slate-300 hover:text-red-500 disabled:opacity-50">
                <IconTrash className="w-4 h-4" />
              </button>
            </div>
            <h4 className="font-bold text-lg text-slate-800">{inv.name}</h4>
            <p className="text-sm text-slate-500 mb-4">Gerido por: {inv.user}</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(inv.currentAmount, hidden)}</p>
            <div className="mt-4 flex gap-2">
               <Button variant="secondary" className="text-xs py-1 px-2 w-full" onClick={() => alert('Para simplificar, para editar o saldo delete e recrie por enquanto.')}>+ Aportar</Button>
            </div>
          </Card>
        ))}
        {filteredInvestments.length === 0 && (
          <div className="col-span-full p-8 text-center text-slate-400">
             {isLoading ? 'Carregando investimentos...' : 'Nenhum investimento cadastrado neste perfil.'}
          </div>
        )}
      </div>
    </div>
  );
};

// 4. Advisor Page
const AdvisorPage = ({ transactions, investments, currentUser }: { transactions: Transaction[], investments: Investment[], currentUser: User }) => {
  const [advice, setAdvice] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const filteredTransactions = transactions.filter(t => currentUser === 'Ambos' ? true : t.user === currentUser);
  const filteredInvestments = investments.filter(i => currentUser === 'Ambos' ? true : i.user === currentUser);

  const handleConsult = async () => {
    setLoading(true);
    const result = await getFinancialAdvice(filteredTransactions, filteredInvestments);
    setAdvice(result);
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 bg-purple-100 rounded-full text-purple-600 mb-2">
          <IconBrain className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Consultor Financeiro AI ({currentUser})</h2>
        <p className="text-slate-500">Utilize a inteligência artificial para analisar seus gastos e receber dicas personalizadas.</p>
      </div>

      <div className="flex justify-center">
        <Button onClick={handleConsult} disabled={loading} className="w-full md:w-auto px-8 bg-purple-600 hover:bg-purple-700">
          {loading ? 'Analisando...' : 'Gerar Análise Financeira'}
        </Button>
      </div>
      
      {advice && (
        <Card className="prose prose-slate max-w-none bg-purple-50 border-purple-100">
           <div dangerouslySetInnerHTML={{ __html: advice.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
        </Card>
      )}
    </div>
  );
};

// 5. Settings Page (Unifying Categories)
const SettingsPage = ({
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onRestoreDefaults
}: {
  categories: Category[];
  onAddCategory: (name: string, type: string) => void;
  onUpdateCategory: (id: string, oldName: string, newName: string) => void;
  onDeleteCategory: (id: string, name: string) => void;
  onRestoreDefaults: () => void;
}) => {
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('despesa');
  const [viewType, setViewType] = useState<'receita' | 'despesa'>('despesa');
  
  // Edit State
  const [editingCat, setEditingCat] = useState<{id: string, name: string, oldName: string} | null>(null);

  const handleCreate = () => {
    if (newCatName) {
      onAddCategory(newCatName, newCatType);
      setNewCatName('');
    }
  };
  
  const handleUpdateSubmit = () => {
     if (editingCat && editingCat.name.trim() !== '') {
        onUpdateCategory(editingCat.id, editingCat.oldName, editingCat.name);
        setEditingCat(null);
     }
  };

  const handleLogout = () => {
     localStorage.removeItem('app_authenticated');
     window.location.reload();
  };
  
  const displayedCategories = categories.filter(c => c.type === viewType).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
           Status do Sistema
        </h3>
        <p className="text-sm text-slate-600 mb-4">
          Este aplicativo está conectado à nuvem (Supabase). Seus dados estão sincronizados automaticamente.
        </p>
        <div className="flex items-center gap-2 text-emerald-600 font-medium bg-emerald-50 p-3 rounded-lg border border-emerald-100">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
           Sincronização Ativa
        </div>
      </Card>
      
      <Card>
         <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">Gerenciar Categorias</h3>
            <button 
               onClick={onRestoreDefaults}
               className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
               Restaurar Categorias Padrão
            </button>
         </div>
         
         {/* Add New */}
         <div className="bg-slate-50 p-4 rounded-lg mb-8 border border-slate-100">
             <h4 className="text-sm font-semibold text-slate-700 mb-2">Adicionar Nova Categoria</h4>
             <div className="flex flex-col md:flex-row gap-2">
                <input 
                  type="text" 
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="Nome da categoria..."
                  className="flex-1 border border-slate-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select 
                  value={newCatType}
                  onChange={e => setNewCatType(e.target.value)}
                  className="border border-slate-300 rounded-lg p-2 text-sm outline-none bg-white"
                >
                  <option value="despesa">Despesa</option>
                  <option value="receita">Receita</option>
                </select>
                <Button onClick={handleCreate} disabled={!newCatName} className="py-2 text-sm">Adicionar</Button>
             </div>
         </div>

         {/* Filters */}
         <div className="flex gap-2 mb-4">
             <button 
                onClick={() => setViewType('despesa')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${viewType === 'despesa' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
             >
                Despesas
             </button>
             <button 
                onClick={() => setViewType('receita')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${viewType === 'receita' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
             >
                Receitas
             </button>
         </div>

         <div className="space-y-2">
             {displayedCategories.map(c => (
                <div key={c.id} className="flex justify-between items-center bg-white border border-slate-100 p-3 rounded-lg hover:shadow-sm transition-shadow group">
                   <div className="flex items-center gap-3">
                      {c.is_system && <span title="Categoria do Sistema"><IconShield className="w-4 h-4 text-slate-300" /></span>}
                      <span className="text-slate-800 font-medium">{c.name}</span>
                   </div>
                   <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                         onClick={() => setEditingCat({id: c.id, name: c.name, oldName: c.name})}
                         className="text-slate-400 hover:text-blue-500 p-1 rounded hover:bg-blue-50"
                         title="Renomear"
                      >
                         <IconEdit className="w-4 h-4" />
                      </button>
                      {!c.is_system && (
                         <button 
                            onClick={() => onDeleteCategory(c.id, c.name)}
                            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50"
                            title="Excluir"
                         >
                            <IconTrash className="w-4 h-4" />
                         </button>
                      )}
                   </div>
                </div>
             ))}
             {displayedCategories.length === 0 && (
                <p className="text-center text-slate-400 italic py-4">Nenhuma categoria encontrada.</p>
             )}
         </div>
      </Card>
      
      {/* Edit Category Modal */}
      <Modal isOpen={!!editingCat} onClose={() => setEditingCat(null)} title="Renomear Categoria">
         <div className="space-y-4">
             <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded text-sm">
                <p><strong>Atenção:</strong> Ao renomear, todas as transações passadas que usam "<strong>{editingCat?.oldName}</strong>" serão atualizadas para o novo nome.</p>
             </div>
             <Input 
                label="Novo Nome"
                value={editingCat?.name || ''}
                onChange={e => setEditingCat(prev => prev ? {...prev, name: e.target.value} : null)}
             />
             <Button onClick={handleUpdateSubmit} className="w-full">Salvar Alterações</Button>
         </div>
      </Modal>

      <Card>
         <h3 className="text-lg font-bold text-slate-800 mb-4">Conta</h3>
         <Button onClick={handleLogout} variant="danger" className="w-full">
           Sair do Aplicativo
         </Button>
      </Card>
    </div>
  );
};

// 6. Login Page (Unchanged)
const LoginPage = ({ onLogin }: { onLogin: () => void }) => {
   const [password, setPassword] = useState('');
   const [error, setError] = useState(false);

   const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (password === APP_PASSWORD) {
         onLogin();
      } else {
         setError(true);
      }
   };

   return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
         <Card className="w-full max-w-md">
            <div className="text-center mb-6">
               <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  DuoFin
               </h1>
               <p className="text-slate-500">Thiago & Marcela</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Senha de Acesso</label>
                  <input 
                     type="password" 
                     className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
                     value={password}
                     onChange={e => { setPassword(e.target.value); setError(false); }}
                     placeholder="Digite a senha..."
                     autoFocus
                  />
               </div>
               {error && <p className="text-red-500 text-sm">Senha incorreta.</p>}
               <Button className="w-full py-3" onClick={() => {}}>Entrar</Button>
            </form>
         </Card>
      </div>
   );
};

// --- Main App Component ---

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // App State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'investments' | 'advisor' | 'settings'>('dashboard');
  const [currentUser, setCurrentUser] = useState<User>('Ambos'); // New State for Profile Context
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // Mobile Menu State
  
  // Privacy Mode
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]); // Unified Categories
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
     const auth = localStorage.getItem('app_authenticated');
     if (auth === 'true') {
        setIsAuthenticated(true);
     }
     setCheckingAuth(false);
  }, []);

  const handleLogin = () => {
     localStorage.setItem('app_authenticated', 'true');
     setIsAuthenticated(true);
  };

  const handleNavClick = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };
  
  const togglePrivacy = () => {
     if (isPrivacyMode) {
        setUnlockModalOpen(true);
     } else {
        setIsPrivacyMode(true);
     }
  };
  
  const handleUnlock = () => {
     if (unlockPassword === APP_PASSWORD) {
        setIsPrivacyMode(false);
        setUnlockModalOpen(false);
        setUnlockPassword('');
        setUnlockError(false);
     } else {
        setUnlockError(true);
     }
  };

  // Load Data from Supabase
  const fetchData = async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);
    try {
      // 1. Transactions
      const { data: transData, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });
      if (transError) throw transError;

      // 2. Investments
      const { data: invData, error: invError } = await supabase
        .from('investments')
        .select('*');
      if (invError) throw invError;

      // 3. Categories (Unified)
      const { data: catData, error: catError } = await supabase.from('categories').select('*');
      if (catError && catError.code !== '42P01') console.error(catError); 

      // 3.1 Migration Logic: Force Sync defaults
      // Check which defaults are missing from the DB
      const existingNames = (catData || []).map((c: any) => c.name);
      const missingDefaults: any[] = [];
      
      CATEGORIES.INCOME.forEach(name => {
         if (!existingNames.includes(name)) missingDefaults.push({ name, type: 'receita', is_system: true });
      });
      
      CATEGORIES.EXPENSE.forEach(name => {
         if (!existingNames.includes(name)) missingDefaults.push({ name, type: 'despesa', is_system: true });
      });
      
      let finalCategories = catData || [];

      if (missingDefaults.length > 0) {
         console.log("Sincronizando categorias faltantes...", missingDefaults);
         const { data: insertedData, error: insertError } = await supabase
            .from('categories')
            .insert(missingDefaults)
            .select();
            
         if (insertError) console.error("Erro na migração:", insertError);
         if (insertedData) {
            finalCategories = [...finalCategories, ...insertedData];
         }
      }
      
      setCategories(finalCategories);

      // 4. Budgets
      const { data: budData, error: budError } = await supabase.from('budgets').select('*');
      if (budError && budError.code !== '42P01') console.error(budError);

      const mappedInvestments = (invData || []).map((i: any) => ({
        id: i.id,
        name: i.name,
        type: i.type,
        user: i.user,
        currentAmount: i.current_amount,
        history: i.history || []
      }));

      setTransactions(transData || []);
      setInvestments(mappedInvestments);
      if (budData) setBudgets(budData);

    } catch (err: any) {
      console.error("Erro ao carregar dados:", err);
      if (err.message?.includes('Invalid URL')) {
        setError('Configuração do Supabase pendente. Edite o arquivo services/supabase.ts');
      } else {
        // Safe error fallback
        const msg = typeof err === 'object' && err?.message ? err.message : 'Erro ao conectar ao banco de dados.';
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAuthenticated]);

  // Actions
  const addTransaction = async (t: Omit<Transaction, 'id'>) => {
    setIsLoading(true);
    try {
       const transactionsToInsert = [];
       const months = (t.is_recurring && t.recurring_months && t.recurring_months > 0) ? t.recurring_months : 1;
       
       for (let i = 0; i < months; i++) {
          const dateObj = new Date(t.date);
          dateObj.setMonth(dateObj.getMonth() + i);
          
          transactionsToInsert.push({
             description: t.description,
             amount: t.amount,
             type: t.type,
             category: t.category,
             user: t.user,
             date: dateObj.toISOString().split('T')[0],
             is_recurring: t.is_recurring,
             recurring_months: t.recurring_months
          });
       }

      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionsToInsert)
        .select();

      if (error) throw error;
      if (data) {
        setTransactions(prev => [...prev, ...data as Transaction[]]);
        if (months > 1) alert(`Transação repetida por ${months} meses criada com sucesso!`);
      }
    } catch (err) {
      alert("Erro ao salvar transação. Verifique console.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    setIsLoading(true);
    try {
       const { error } = await supabase
          .from('transactions')
          .update({
             description: updates.description,
             amount: updates.amount,
             date: updates.date,
             category: updates.category,
             type: updates.type
          })
          .eq('id', id);
          
       if (error) throw error;
       
       setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    } catch (err) {
       alert("Erro ao atualizar transação.");
       console.error(err);
    } finally {
       setIsLoading(false);
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir?')) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      alert("Erro ao excluir.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Category Actions
  const addCategory = async (name: string, type: string) => {
    try {
      const { data, error } = await supabase.from('categories').insert([{ name, type, is_system: false }]).select();
      if (error) throw error;
      if (data) setCategories(prev => [...prev, data[0]]);
    } catch (err) {
      console.error(err);
      alert('Erro ao criar categoria.');
    }
  };
  
  const updateCategory = async (id: string, oldName: string, newName: string) => {
     try {
        // 1. Update Category Name
        const { error: catError } = await supabase
           .from('categories')
           .update({ name: newName })
           .eq('id', id);
           
        if (catError) throw catError;
        
        // 2. Cascade Update Transactions
        const { error: transError } = await supabase
           .from('transactions')
           .update({ category: newName })
           .eq('category', oldName);
           
        if (transError) console.error("Erro ao atualizar transações antigas:", transError);
        
        // 3. Update Local State
        setCategories(prev => prev.map(c => c.id === id ? { ...c, name: newName } : c));
        setTransactions(prev => prev.map(t => t.category === oldName ? { ...t, category: newName } : t));
        
     } catch (err) {
        console.error(err);
        alert('Erro ao renomear categoria.');
     }
  };

  const deleteCategory = async (id: string, name: string) => {
    // Check usage
    const isUsed = transactions.some(t => t.category === name);
    if (isUsed) {
       alert(`Não é possível excluir a categoria "${name}" pois ela é usada em transações.`);
       return;
    }
    
    if (!confirm('Excluir esta categoria?')) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir categoria.');
    }
  };

  const restoreDefaults = async () => {
    if (!confirm('Isso adicionará as categorias padrão (Aluguel, Mercado, etc) se elas não existirem. Deseja continuar?')) return;
    
    setIsLoading(true);
    try {
       const existingNames = categories.map(c => c.name);
       const toInsert = [];
       
       CATEGORIES.INCOME.forEach(name => {
          if (!existingNames.includes(name)) toInsert.push({ name, type: 'receita', is_system: true });
       });
       
       CATEGORIES.EXPENSE.forEach(name => {
          if (!existingNames.includes(name)) toInsert.push({ name, type: 'despesa', is_system: true });
       });
       
       if (toInsert.length > 0) {
          const { data, error } = await supabase.from('categories').insert(toInsert).select();
          if (error) throw error;
          if (data) {
             setCategories(prev => [...prev, ...data]);
             alert(`${data.length} categorias padrão restauradas.`);
          }
       } else {
          alert('Todas as categorias padrão já existem.');
       }
    } catch (err) {
       console.error(err);
       alert('Erro ao restaurar padrões.');
    } finally {
       setIsLoading(false);
    }
  };

  const updateBudget = async (category: string, limit: number) => {
    try {
      const existing = budgets.find(b => b.category === category);
      if (existing) {
         if (limit === 0) {
            await supabase.from('budgets').delete().eq('id', existing.id);
            setBudgets(prev => prev.filter(b => b.id !== existing.id));
         } else {
            const { error } = await supabase.from('budgets').update({ limit_amount: limit }).eq('id', existing.id);
            if (error) throw error;
            setBudgets(prev => prev.map(b => b.id === existing.id ? { ...b, limit_amount: limit } : b));
         }
      } else {
         const { data, error } = await supabase.from('budgets').insert([{ category, limit_amount: limit }]).select();
         if (error) throw error;
         if (data) setBudgets(prev => [...prev, data[0]]);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar meta.');
    }
  };

  const generateRecurringTransactions = async () => {
    const prevMonthDate = new Date(currentDate);
    prevMonthDate.setMonth(currentDate.getMonth() - 1);

    const prevMonthTransactions = transactions.filter(t => {
       const tDate = new Date(t.date);
       return tDate.getMonth() === prevMonthDate.getMonth() && 
              tDate.getFullYear() === prevMonthDate.getFullYear() &&
              t.is_recurring &&
              (currentUser === 'Ambos' ? true : t.user === currentUser); // Check recurrence for current user view
    });

    if (prevMonthTransactions.length === 0) {
       alert('Nenhuma transação recorrente encontrada no mês anterior para este perfil.');
       return;
    }

    let count = 0;
    for (const t of prevMonthTransactions) {
       const exists = transactions.some(curr => 
          curr.description === t.description && 
          curr.amount === t.amount &&
          new Date(curr.date).getMonth() === currentDate.getMonth()
       );

       if (!exists) {
          const newDate = new Date(t.date);
          newDate.setMonth(currentDate.getMonth());
          newDate.setFullYear(currentDate.getFullYear());
          
          await addTransaction({
             description: t.description,
             amount: t.amount,
             type: t.type,
             category: t.category,
             user: t.user,
             date: newDate.toISOString().split('T')[0],
             is_recurring: t.is_recurring,
             recurring_months: t.recurring_months
          });
          count++;
       }
    }
    
    if (count > 0) alert(`${count} transações recorrentes geradas para este mês!`);
    else alert('Todas as transações recorrentes já foram lançadas neste mês.');
  };

  const addInvestment = async (inv: Omit<Investment, 'id' | 'history'>, initialAmount: number) => {
    setIsLoading(true);
    try {
      const historyItem = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        amount: initialAmount,
        type: 'aporte' as const
      };

      const { data, error } = await supabase
        .from('investments')
        .insert([{
          name: inv.name,
          type: inv.type,
          user: inv.user,
          current_amount: initialAmount,
          history: [historyItem]
        }])
        .select();

      if (error) throw error;
      
      if (data && data[0]) {
        const newInv = data[0];
        setInvestments(prev => [...prev, {
          id: newInv.id,
          name: newInv.name,
          type: newInv.type,
          user: newInv.user,
          currentAmount: newInv.current_amount,
          history: newInv.history
        }]);
      }
    } catch (err) {
      alert("Erro ao salvar investimento.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteInvestment = async (id: string) => {
    if (!confirm('Tem certeza? Isso apagará o histórico deste investimento.')) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from('investments').delete().eq('id', id);
      if (error) throw error;
      setInvestments(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      alert("Erro ao excluir.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = useMemo(() => {
    const filteredTransactions = transactions.filter(t => currentUser === 'Ambos' ? true : t.user === currentUser);
    const filteredInvestments = investments.filter(i => currentUser === 'Ambos' ? true : i.user === currentUser);

    const income = filteredTransactions.filter(t => t.type === 'receita').reduce((acc, t) => acc + t.amount, 0);
    const expenses = filteredTransactions.filter(t => t.type === 'despesa').reduce((acc, t) => acc + t.amount, 0);
    const invested = filteredInvestments.reduce((acc, i) => acc + i.currentAmount, 0);
    return { income, expenses, balance: income - expenses, invested };
  }, [transactions, investments, currentUser]);

  // Render Helpers
  const renderContent = () => {
    if (error) {
      return (
        <Card className="bg-red-50 border-red-200">
           <h3 className="text-red-700 font-bold mb-2">Configuração Necessária</h3>
           <p className="text-red-600">{typeof error === 'string' ? error : 'Ocorreu um erro desconhecido (verifique o console).'}</p>
        </Card>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
           <DashboardPage 
              transactions={transactions} 
              stats={stats} 
              budgets={budgets}
              onUpdateBudget={updateBudget}
              currentDate={currentDate}
              onMonthChange={setCurrentDate}
              currentUser={currentUser}
              hidden={isPrivacyMode}
           />
        );
      case 'transactions':
        return (
           <TransactionsPage 
              transactions={transactions} 
              onAdd={addTransaction} 
              onUpdate={updateTransaction}
              onDelete={deleteTransaction} 
              isLoading={isLoading} 
              categories={categories}
              currentDate={currentDate}
              onMonthChange={setCurrentDate}
              onGenerateRecurring={generateRecurringTransactions}
              currentUser={currentUser}
              hidden={isPrivacyMode}
           />
        );
      case 'investments':
        return (
          <InvestmentsPage 
            investments={investments} 
            onAdd={addInvestment} 
            onDelete={deleteInvestment} 
            isLoading={isLoading} 
            currentUser={currentUser}
            hidden={isPrivacyMode}
          />
        );
      case 'advisor':
        return <AdvisorPage transactions={transactions} investments={investments} currentUser={currentUser} />;
      case 'settings':
        return (
           <SettingsPage 
              categories={categories} 
              onAddCategory={addCategory} 
              onUpdateCategory={updateCategory}
              onDeleteCategory={deleteCategory}
              onRestoreDefaults={restoreDefaults}
           />
        );
      default:
        return null;
    }
  };

  if (checkingAuth) return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Carregando...</div>;

  if (!isAuthenticated) {
     return <LoginPage onLogin={handleLogin} />;
  }

  // Dynamic Background based on selected User
  const getMainBackground = () => {
    if (currentUser === 'Thiago') return 'bg-blue-50/50';
    if (currentUser === 'Marcela') return 'bg-pink-50/50';
    return 'bg-slate-50';
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row font-sans transition-colors duration-500 ${getMainBackground()}`}>
      {/* Sidebar Navigation */}
      <aside className={`
        bg-white border-r border-slate-200 flex-shrink-0 z-50
        md:w-64 md:h-screen md:sticky md:top-0 
        w-full fixed top-0 left-0 shadow-sm md:shadow-none
        ${mobileMenuOpen ? 'h-screen' : 'h-auto'}
      `}>
        <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              DuoFin
            </h1>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wide">Thiago & Marcela</p>
          </div>
          <button 
             className="md:hidden text-slate-600 p-2" 
             onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
             {mobileMenuOpen ? <IconClose /> : <IconMenu />}
          </button>
        </div>
        
        <nav className={`
            p-4 space-y-2 bg-white
            ${mobileMenuOpen ? 'block' : 'hidden'} md:block
        `}>
          <NavButton 
            active={activeTab === 'dashboard'} 
            onClick={() => handleNavClick('dashboard')} 
            icon={<IconPieChart />} 
            label="Visão Geral" 
          />
          <NavButton 
            active={activeTab === 'transactions'} 
            onClick={() => handleNavClick('transactions')} 
            icon={<IconList />} 
            label="Transações" 
          />
          <NavButton 
            active={activeTab === 'investments'} 
            onClick={() => handleNavClick('investments')} 
            icon={<IconTrendingUp />} 
            label="Investimentos" 
          />
          <NavButton 
            active={activeTab === 'advisor'} 
            onClick={() => handleNavClick('advisor')} 
            icon={<IconBrain />} 
            label="Consultor AI" 
            special
          />
          <div className="pt-4 mt-4 border-t border-slate-100">
            <NavButton 
              active={activeTab === 'settings'} 
              onClick={() => handleNavClick('settings')} 
              icon={<IconSettings />} 
              label="Configurações" 
            />
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 pt-24 md:pt-8 overflow-y-auto">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 capitalize">
              {activeTab === 'advisor' ? 'Consultor AI' : activeTab === 'dashboard' ? 'Painel de Controle' : activeTab === 'settings' ? 'Configurações' : activeTab}
            </h2>
            <p className="text-slate-500 text-sm">
               Visualizando dados de: <strong className="text-slate-700">{currentUser === 'Ambos' ? 'Geral (Thiago + Marcela)' : currentUser}</strong>
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
               <button 
                 onClick={() => setCurrentUser('Ambos')}
                 className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentUser === 'Ambos' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
               >
                  Geral
               </button>
               <button 
                 onClick={() => setCurrentUser('Thiago')}
                 className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentUser === 'Thiago' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-blue-50'}`}
               >
                  Thiago
               </button>
               <button 
                 onClick={() => setCurrentUser('Marcela')}
                 className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentUser === 'Marcela' ? 'bg-pink-600 text-white shadow-md' : 'text-slate-500 hover:bg-pink-50'}`}
               >
                  Marcela
               </button>
            </div>
            
            <button 
               onClick={togglePrivacy}
               className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-colors"
               title={isPrivacyMode ? "Mostrar Valores" : "Ocultar Valores"}
            >
               {isPrivacyMode ? <IconEyeOff className="w-5 h-5" /> : <IconEye className="w-5 h-5" />}
            </button>
          </div>
        </header>
        {renderContent()}
      </main>
      
      {/* Unlock Privacy Modal */}
      <Modal isOpen={unlockModalOpen} onClose={() => { setUnlockModalOpen(false); setUnlockPassword(''); setUnlockError(false); }} title="Desbloquear Visualização">
         <div className="space-y-4">
            <p className="text-sm text-slate-600">Digite a senha do aplicativo para visualizar os valores.</p>
            <Input 
               label="Senha" 
               type="password"
               value={unlockPassword} 
               onChange={e => { setUnlockPassword(e.target.value); setUnlockError(false); }}
               placeholder="Digite a senha..."
            />
            {unlockError && <p className="text-red-500 text-sm">Senha incorreta.</p>}
            <Button onClick={handleUnlock} className="w-full">Desbloquear</Button>
         </div>
      </Modal>
    </div>
  );
};

// Nav Button Component
const NavButton = ({ 
  active, 
  onClick, 
  icon, 
  label,
  special = false
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactElement; 
  label: string;
  special?: boolean;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
      active 
        ? special ? 'bg-purple-100 text-purple-700' : 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
        : special ? 'text-purple-600 hover:bg-purple-50' : 'text-slate-500 hover:bg-slate-100'
    }`}
  >
    {React.cloneElement(icon as React.ReactElement<any>, { className: "w-5 h-5" })}
    {label}
  </button>
);

export default App;
