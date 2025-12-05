import React, { useState, useEffect, useMemo } from 'react';
import { 
  IconTrendingUp, IconTrendingDown, IconWallet, 
  IconPieChart, IconList, IconPlus, IconTrash, IconBrain, IconShield, IconSettings, IconCalendar, IconRefresh, IconTarget, IconClose, IconMenu, IconEdit, IconEye, IconEyeOff, IconCheck, IconClock, IconSearch, IconDownload, IconFileText, IconSun, IconMoon, IconActivity, IconTrophy, IconStar, IconBarChartHorizontal
} from './components/Icons';
import { Card, Button, Input, Select, formatCurrency, Modal, ProgressBar } from './components/UI';
import { MonthlyChart, CategoryChart, EvolutionChart, SemestralChart, LifestyleChart, UserDistChart, TopOffendersChart } from './components/Charts';
import { Transaction, Investment, User, InvestmentType, TransactionType, Budget, Category, PaymentMethod, SavingsGoal } from './types';
import { USERS, CATEGORIES, APP_PASSWORD } from './constants';
import { getFinancialAdvice } from './services/geminiService';
import { supabase } from './services/supabase';

// --- Helper Functions ---
const getMonthName = (date: Date) => {
  return date.toLocaleDateString('pt-BR', { month: 'long' });
};

const getMethodLabel = (method: string) => {
   const labels: Record<string, string> = {
      dinheiro: 'Dinheiro',
      pix: 'Pix',
      cartao: 'Cartão',
      boleto: 'Contas à Pagar'
   };
   return labels[method] || method;
};

// --- Reusable Component ---
const MonthSelector = ({ currentDate, onChange }: { currentDate: Date, onChange: (d: Date) => void }) => {
   const prevDate = new Date(currentDate);
   prevDate.setMonth(currentDate.getMonth() - 1);
   
   const nextDate = new Date(currentDate);
   nextDate.setMonth(currentDate.getMonth() + 1);

   const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.value) {
         const [y, m] = e.target.value.split('-');
         const newDate = new Date(Number(y), Number(m) - 1, 1);
         onChange(newDate);
      }
   };

   // Formata YYYY-MM para o input value
   const inputValue = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

   return (
      <div className="flex flex-col items-center gap-2 mb-6">
        <div className="flex items-center gap-2 relative">
            <label className="cursor-pointer text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Selecionar Mês/Ano">
               <IconCalendar className="w-5 h-5" />
            </label>
            <div className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
               {currentDate.getFullYear()}
            </div>
            
            {/* Input invisível cobrindo a área para clique */}
            <input 
               type="month" 
               value={inputValue}
               onChange={handleDateInput}
               className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
        </div>

        <div className="flex justify-center items-center gap-2 md:gap-4 bg-white dark:bg-slate-800 p-2 rounded-full shadow-sm border border-slate-100 dark:border-slate-700 max-w-sm mx-auto select-none">
          <button 
            onClick={() => onChange(prevDate)} 
            className="text-slate-400 text-xs md:text-sm font-medium hover:text-slate-600 dark:hover:text-slate-200 px-3 capitalize transition-colors"
          >
             {getMonthName(prevDate)}
          </button>
          
          <div className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white font-bold px-6 py-2 rounded-full capitalize shadow-inner text-sm md:text-base border border-slate-200 dark:border-slate-600 min-w-[120px] text-center">
             {getMonthName(currentDate)}
          </div>
          
          <button 
            onClick={() => onChange(nextDate)} 
            className="text-slate-400 text-xs md:text-sm font-medium hover:text-slate-600 dark:hover:text-slate-200 px-3 capitalize transition-colors"
          >
             {getMonthName(nextDate)}
          </button>
        </div>
      </div>
   );
};

// --- Sub-components ---

// 1. Transactions List Component with Filters
const TransactionsPage = ({ 
  transactions, 
  onAdd, 
  onUpdate, 
  onDelete, 
  onToggleStatus, 
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
  onToggleStatus: (id: string, currentStatus: boolean) => void; 
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
    recurring_months: '',
    payment_method: 'pix' as PaymentMethod
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false); // Mobile FAB Modal

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
    
    // Auto-set status: Dinheiro/Pix = Paid, others = Pending
    const autoPaid = ['dinheiro', 'pix'].includes(form.payment_method);

    onAdd({
      description: form.description,
      amount: Number(form.amount),
      type: form.type,
      category: form.category,
      user: currentUser, // Auto-assign current user
      date: form.date,
      is_recurring: form.is_recurring,
      recurring_months: form.is_recurring && form.recurring_months ? Number(form.recurring_months) : 0,
      payment_method: form.payment_method,
      is_paid: autoPaid
    });
    setForm({ ...form, description: '', amount: '', is_recurring: false, recurring_months: '', payment_method: 'pix' });
    setIsAddModalOpen(false);
  };
  
  const handleUpdateSubmit = () => {
     if (editingTransaction) {
        onUpdate(editingTransaction.id, {
           description: editingTransaction.description,
           amount: editingTransaction.amount,
           date: editingTransaction.date,
           category: editingTransaction.category,
           type: editingTransaction.type,
           payment_method: editingTransaction.payment_method
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
    // Search filter overrides date filter
    if (searchTerm) {
       const term = searchTerm.toLowerCase();
       const matchesSearch = t.description.toLowerCase().includes(term) || t.category.toLowerCase().includes(term);
       const userMatch = currentUser === 'Ambos' ? true : t.user === currentUser;
       return matchesSearch && userMatch;
    }

    const tDate = new Date(t.date);
    const dateMatch = tDate.getMonth() === currentDate.getMonth() && tDate.getFullYear() === currentDate.getFullYear();
    const userMatch = currentUser === 'Ambos' ? true : t.user === currentUser;
    return dateMatch && userMatch;
  });

  const exportToCSV = () => {
    const headers = ["Data", "Descrição", "Valor", "Tipo", "Categoria", "Usuario", "Pagamento", "Status"];
    const rows = filteredTransactions.map(t => [
       t.date,
       `"${t.description.replace(/"/g, '""')}"`,
       t.amount.toFixed(2),
       t.type,
       t.category,
       t.user,
       t.payment_method,
       t.is_paid ? "Pago" : "Pendente"
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
       + headers.join(",") + "\n" 
       + rows.map(e => e.join(",")).join("\n");
       
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `finova_relatorio_${currentDate.toISOString().slice(0,7)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Shared Add Form Render Function (Prevents remounting and focus loss)
  const renderTransactionForm = () => (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
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
        <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Data</label>
        <input 
          type="date" 
          value={form.date} 
          onChange={e => setForm({...form, date: e.target.value})}
          className="border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full"
        />
      </div>
      <div className="flex flex-col gap-1 w-full">
        <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Tipo</label>
        <select 
          value={form.type} 
          onChange={handleTypeChange}
          className="border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full"
        >
          <option value="receita">Receita</option>
          <option value="despesa">Despesa</option>
        </select>
      </div>
      <div className="flex flex-col gap-1 w-full">
        <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Pagamento</label>
        <select 
          value={form.payment_method} 
          onChange={e => setForm({...form, payment_method: e.target.value as PaymentMethod})}
          className="border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full"
        >
          <option value="pix">Pix</option>
          <option value="dinheiro">Dinheiro</option>
          <option value="cartao">Cartão</option>
          <option value="boleto">Contas à Pagar</option>
        </select>
      </div>
      
      <div className="lg:col-span-2 flex items-center gap-4">
        <div className="flex-1">
          <Select 
            label="Categoria"
            value={form.category}
            onChange={e => setForm({...form, category: e.target.value})}
            options={availableCategories}
          />
        </div>
        
        <div className="flex items-center gap-2 pt-5">
            <div className="flex items-center h-full">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={form.is_recurring} 
                    onChange={e => setForm({...form, is_recurring: e.target.checked})}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">Recorrente?</span>
              </label>
            </div>
            {form.is_recurring && (
               <div className="w-24">
                 <input
                    type="number"
                    placeholder="Meses"
                    value={form.recurring_months} 
                    onChange={e => setForm({...form, recurring_months: e.target.value})}
                    className="border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm w-full outline-none focus:ring-2 focus:ring-blue-500"
                 />
               </div>
            )}
        </div>
      </div>

      <div className="lg:col-span-4 flex justify-end mt-2">
        <Button disabled={isLoading} className="w-full md:w-auto px-8">
          {isLoading ? 'Salvando...' : 'Adicionar Movimentação'}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      {!searchTerm && <MonthSelector currentDate={currentDate} onChange={onMonthChange} />}

      <div className="flex flex-col md:flex-row justify-between gap-4">
         <div className="relative w-full md:w-96">
            <IconSearch className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
            <input 
               type="text" 
               placeholder="Buscar (nome ou categoria)..." 
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
         </div>
         <div className="flex gap-2">
            <Button variant="secondary" onClick={exportToCSV} className="text-xs py-1 px-3">
               <IconDownload className="w-3 h-3" /> Exportar
            </Button>
            <Button variant="secondary" onClick={onGenerateRecurring} className="text-xs py-1 px-3">
               <IconRefresh className="w-3 h-3" /> Recorrentes
            </Button>
         </div>
      </div>

      {currentUser === 'Ambos' ? (
        <Card className="bg-slate-50 dark:bg-slate-800 border-dashed border-2 border-slate-200 dark:border-slate-600 text-center py-8">
           <p className="text-slate-500 dark:text-slate-400 font-medium">Selecione o perfil de <span className="text-blue-600 font-bold">Thiago</span> ou <span className="text-pink-600 font-bold">Marcela</span> para adicionar.</p>
        </Card>
      ) : (
        // Desktop Form
        <Card className={`hidden md:block border-l-4 ${currentUser === 'Thiago' ? 'border-l-blue-500' : 'border-l-pink-500'}`}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
            <IconPlus className="w-5 h-5" /> Nova Movimentação ({currentUser})
          </h2>
          {renderTransactionForm()}
        </Card>
      )}

      {/* Mobile FAB */}
      {currentUser !== 'Ambos' && (
         <button 
            onClick={() => setIsAddModalOpen(true)}
            className="md:hidden fixed bottom-6 right-6 z-40 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
         >
            <IconPlus className="w-6 h-6" />
         </button>
      )}

      {/* Mobile Add Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={`Nova Movimentação (${currentUser})`}>
         {renderTransactionForm()}
      </Modal>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 uppercase text-xs">
              <tr>
                <th className="p-4">Data</th>
                <th className="p-4">Descrição</th>
                <th className="p-4">Quem</th>
                <th className="p-4">Categoria</th>
                <th className="p-4">Forma</th>
                <th className="p-4 text-right">Valor</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                <tr key={t.id} className={`border-b border-slate-100 dark:border-slate-700 hover:bg-opacity-80 transition-colors ${t.is_paid ? 'bg-emerald-100 dark:bg-emerald-900/20' : 'bg-white dark:bg-slate-800'}`}>
                  <td className="p-4 whitespace-nowrap text-slate-800 dark:text-slate-300">
                    {new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    {t.is_recurring && (
                        <div className="flex flex-col mt-1">
                           <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 px-1 rounded border border-indigo-200 dark:border-indigo-800 w-fit uppercase font-bold tracking-wide">
                              <IconRefresh className="w-3 h-3 inline mr-1" /> RECORRENTE
                           </span>
                        </div>
                    )}
                  </td>
                  <td className="p-4 font-medium text-slate-800 dark:text-white whitespace-nowrap">{t.description}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${t.user === 'Thiago' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300'}`}>
                      {t.user}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{t.category}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-400 text-xs uppercase font-semibold whitespace-nowrap">
                     {getMethodLabel(t.payment_method || 'pix')}
                  </td>
                  <td className={`p-4 text-right font-bold whitespace-nowrap ${t.type === 'receita' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {t.type === 'receita' ? '+' : '-'} {formatCurrency(t.amount, hidden)}
                  </td>
                  <td className="p-4 text-center">
                     {t.is_paid ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 px-2 py-1 rounded-full">
                           <IconCheck className="w-3 h-3"/> Pago
                        </span>
                     ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 px-2 py-1 rounded-full">
                           <IconClock className="w-3 h-3"/> Pendente
                        </span>
                     )}
                  </td>
                  <td className="p-4 text-center flex items-center justify-center gap-2">
                    {!t.is_paid && (
                       <button onClick={() => onToggleStatus(t.id, false)} title="Marcar como Pago" className="text-slate-400 hover:text-emerald-500 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 p-1 rounded-full hover:border-emerald-500 transition-colors">
                          <IconCheck className="w-4 h-4" />
                       </button>
                    )}
                    {t.is_paid && (
                       <button onClick={() => onToggleStatus(t.id, true)} title="Reabrir" className="text-emerald-500 hover:text-amber-500 bg-white dark:bg-slate-700 border border-emerald-200 dark:border-slate-600 p-1 rounded-full hover:border-amber-500 transition-colors opacity-50 hover:opacity-100">
                          <IconRefresh className="w-4 h-4" />
                       </button>
                    )}
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
                  <td colSpan={8} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    Nenhuma transação encontrada.
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
                  <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Data</label>
                  <input 
                     type="date" 
                     value={editingTransaction.date} 
                     onChange={e => setEditingTransaction({...editingTransaction, date: e.target.value})}
                     className="border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full"
                  />
               </div>
               <div className="flex flex-col gap-1 w-full">
                  <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Pagamento</label>
                  <select 
                    value={editingTransaction.payment_method || 'pix'} 
                    onChange={e => setEditingTransaction({...editingTransaction, payment_method: e.target.value as PaymentMethod})}
                    className="border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full"
                  >
                    <option value="pix">Pix</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="cartao">Cartão</option>
                    <option value="boleto">Contas à Pagar</option>
                  </select>
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
  categories,
  onUpdateBudget,
  savingsGoals,
  onUpdateSavings,
  currentDate,
  onMonthChange,
  currentUser,
  hidden
}: { 
  transactions: Transaction[]; 
  stats: any;
  budgets: Budget[];
  categories: Category[];
  onUpdateBudget: (cat: string, limit: number) => void;
  savingsGoals: SavingsGoal[];
  onUpdateSavings: (name: string, target: number, current: number) => void;
  currentDate: Date;
  onMonthChange: (d: Date) => void;
  currentUser: User;
  hidden: boolean;
}) => {
  const [editingBudget, setEditingBudget] = useState<{cat: string, val: string} | null>(null);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | {name: '', target: '', current: ''} | null>(null);

  // Filter Transactions by Selected Month AND User
  const filteredTransactions = transactions.filter(t => {
    const tDate = new Date(t.date);
    const dateMatch = tDate.getMonth() === currentDate.getMonth() && tDate.getFullYear() === currentDate.getFullYear();
    const userMatch = currentUser === 'Ambos' ? true : t.user === currentUser;
    return dateMatch && userMatch;
  });

  // Filter Transactions by User ONLY (for History Chart)
  const userHistoryTransactions = useMemo(() => {
     return transactions.filter(t => currentUser === 'Ambos' ? true : t.user === currentUser);
  }, [transactions, currentUser]);

  // Calculate Previous Month Stats for Comparison
  const prevMonthStats = useMemo(() => {
     const prevDate = new Date(currentDate);
     prevDate.setMonth(currentDate.getMonth() - 1);
     
     const prevTrans = transactions.filter(t => {
        const tDate = new Date(t.date);
        const dateMatch = tDate.getMonth() === prevDate.getMonth() && tDate.getFullYear() === prevDate.getFullYear();
        const userMatch = currentUser === 'Ambos' ? true : t.user === currentUser;
        return dateMatch && userMatch;
     });
     
     const expenses = prevTrans.filter(t => t.type === 'despesa').reduce((acc, t) => acc + t.amount, 0);
     const income = prevTrans.filter(t => t.type === 'receita').reduce((acc, t) => acc + t.amount, 0);
     return { expenses, income };
  }, [transactions, currentDate, currentUser]);
  
  // Calculate Stats for FILTERED transactions
  const monthlyStats = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'receita').reduce((acc, t) => acc + t.amount, 0);
    const expenses = filteredTransactions.filter(t => t.type === 'despesa').reduce((acc, t) => acc + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [filteredTransactions]);

  // Calculate Variation
  const getVariation = (current: number, previous: number) => {
     if (previous === 0) return null;
     const diff = ((current - previous) / previous) * 100;
     return diff;
  };

  const expenseVariation = getVariation(monthlyStats.expenses, prevMonthStats.expenses);
  const incomeVariation = getVariation(monthlyStats.income, prevMonthStats.income);

  // Pending Transactions for the Card
  const pendingTransactions = useMemo(() => {
     return filteredTransactions.filter(t => t.type === 'despesa' && !t.is_paid).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredTransactions]);
  
  const totalPending = pendingTransactions.reduce((acc, t) => acc + t.amount, 0);

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

  const handleGoalSave = () => {
     if (editingGoal) {
        // @ts-ignore
        onUpdateSavings(editingGoal.name, Number(editingGoal.target_amount || editingGoal.target), Number(editingGoal.current_amount || editingGoal.current));
        setEditingGoal(null);
     }
  };

  return (
    <div className="space-y-6">
       {/* Month Selector */}
       <MonthSelector currentDate={currentDate} onChange={onMonthChange} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-l-4 border-l-emerald-500 bg-white dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Saldo Atual</p>
              <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{formatCurrency(monthlyStats.balance, hidden)}</h3>
              <p className="text-xs text-slate-400 mt-1">Fluxo de Caixa Real</p>
            </div>
            <div className="p-3 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full">
                <IconWallet className="w-8 h-8" />
            </div>
          </div>
        </Card>
        
        {/* Projeção Final */}
        <Card className="border-l-4 border-l-indigo-500 bg-white dark:bg-slate-800">
           <div className="flex items-center justify-between">
              <div>
                 <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Projeção Final</p>
                 <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{formatCurrency(monthlyStats.balance - totalPending, hidden)}</h3>
                 <p className="text-xs text-slate-400 mt-1">Saldo - Pendências</p>
              </div>
              <div className="p-3 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-full">
                 <IconTarget className="w-8 h-8" />
              </div>
           </div>
        </Card>

        <Card className="border-l-4 border-l-blue-500 bg-white dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Receitas</p>
              <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{formatCurrency(monthlyStats.income, hidden)}</h3>
              {incomeVariation !== null && (
                 <p className={`text-xs mt-1 font-bold ${incomeVariation >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {incomeVariation > 0 ? '▲' : '▼'} {Math.abs(incomeVariation).toFixed(1)}% vs mês anterior
                 </p>
              )}
              {incomeVariation === null && <p className="text-xs text-slate-400 mt-1">vs mês anterior</p>}
            </div>
            <div className="p-3 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                <IconTrendingUp className="w-8 h-8" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-rose-500 bg-white dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Despesas</p>
              <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{formatCurrency(monthlyStats.expenses, hidden)}</h3>
               {expenseVariation !== null && (
                 <p className={`text-xs mt-1 font-bold ${expenseVariation <= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {expenseVariation > 0 ? '▲' : '▼'} {Math.abs(expenseVariation).toFixed(1)}% vs mês anterior
                 </p>
              )}
              {expenseVariation === null && <p className="text-xs text-slate-400 mt-1">vs mês anterior</p>}
            </div>
            <div className="p-3 bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 rounded-full">
                <IconTrendingDown className="w-8 h-8" />
            </div>
          </div>
        </Card>
      </div>

      {/* Contas Pendentes - Moved Up */}
      <Card className="border-l-4 border-l-amber-500 bg-white dark:bg-slate-800">
         <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
               <IconClock className="w-5 h-5 text-amber-500" /> Contas Pendentes ({getMonthName(currentDate)})
            </h3>
            <span className="text-lg font-bold text-rose-600 dark:text-rose-400">{formatCurrency(totalPending, hidden)}</span>
         </div>
         {pendingTransactions.length > 0 ? (
            <div className="overflow-x-auto">
               <table className="w-full text-sm">
                  <thead>
                     <tr className="text-slate-500 dark:text-slate-400 text-left border-b border-slate-100 dark:border-slate-700">
                        <th className="pb-2 font-medium">Vencimento</th>
                        <th className="pb-2 font-medium">Descrição</th>
                        <th className="pb-2 font-medium">Categoria</th>
                        <th className="pb-2 font-medium text-right">Valor</th>
                     </tr>
                  </thead>
                  <tbody>
                     {pendingTransactions.map(t => (
                        <tr key={t.id} className="border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700">
                           <td className="py-2 text-slate-600 dark:text-slate-400">
                              {new Date(t.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                           </td>
                           <td className="py-2 font-medium text-slate-800 dark:text-slate-200">{t.description}</td>
                           <td className="py-2 text-slate-500 dark:text-slate-400">{t.category}</td>
                           <td className="py-2 text-right font-bold text-slate-700 dark:text-slate-300">{formatCurrency(t.amount, hidden)}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         ) : (
            <p className="text-slate-400 text-center py-4">Tudo pago! Nenhuma conta pendente neste mês.</p>
         )}
      </Card>
      
      {/* --- GRÁFICOS ORGANIZADOS EM GRID 2X3 --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <Card>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Fluxo Diário</h3>
            <MonthlyChart transactions={filteredTransactions} hidden={hidden} />
         </Card>
         <Card>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Gastos por Categoria</h3>
            <CategoryChart transactions={filteredTransactions} hidden={hidden} />
         </Card>
         <Card>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
               <IconBarChartHorizontal className="w-5 h-5 text-blue-500" /> Semestral (Histórico)
            </h3>
            <SemestralChart transactions={userHistoryTransactions} hidden={hidden} />
         </Card>
         <Card>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
               <IconStar className="w-5 h-5 text-yellow-500" /> Estilo de Vida
            </h3>
            <LifestyleChart transactions={filteredTransactions} categories={categories} hidden={hidden} />
         </Card>
         <Card>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
               <IconActivity className="w-5 h-5 text-purple-500" /> Distribuição ({currentUser})
            </h3>
            <UserDistChart transactions={filteredTransactions} hidden={hidden} />
         </Card>
         <Card>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
               <IconTrendingDown className="w-5 h-5 text-red-500" /> Top 5 Ofensores
            </h3>
            <TopOffendersChart transactions={filteredTransactions} hidden={hidden} />
         </Card>
      </div>
      
      {/* --- METAS E SONHOS --- */}
      <Card className="border-l-4 border-l-purple-500 bg-white dark:bg-slate-800">
         <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
               <IconTrophy className="w-5 h-5 text-purple-500" /> Metas de Sonhos (Savings)
            </h3>
            <Button variant="secondary" className="text-xs py-1 px-3" onClick={() => setEditingGoal({name: '', target: '', current: ''})}>
               + Novo Sonho
            </Button>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {savingsGoals.filter(g => currentUser === 'Ambos' ? true : g.user === currentUser || g.user === 'Ambos').map(goal => (
               <div key={goal.id} className="cursor-pointer" onClick={() => setEditingGoal(goal)}>
                  <ProgressBar label={goal.name} current={goal.current_amount} max={goal.target_amount} hidden={hidden} />
               </div>
            ))}
            {savingsGoals.length === 0 && <p className="text-slate-400 text-sm">Nenhum sonho cadastrado ainda.</p>}
         </div>
      </Card>

      {/* Budgets / Metas Section */}
      <Card>
         <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
               <IconTarget className="w-5 h-5 text-indigo-500" /> Metas de Gastos (Orçamento)
            </h3>
            <button 
               className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
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
                        <div className="flex justify-between items-center p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-700 border border-transparent hover:border-slate-100 dark:hover:border-slate-600 mb-2">
                           <span className="text-slate-700 dark:text-slate-300 font-medium">{cat}</span>
                           <span className="text-xs text-blue-500 opacity-0 group-hover:opacity-100">Definir Meta +</span>
                           <span className="text-slate-500 dark:text-slate-400 font-bold">{formatCurrency(spendingByCategory[cat], hidden)}</span>
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
      
      {/* Patrimônio Investido (Last) */}
      <Card>
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-xl font-bold text-slate-800 dark:text-white">Patrimônio Investido ({currentUser})</h3>
             <IconActivity className="w-6 h-6 text-emerald-500" />
          </div>
          <div className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 mb-2">
            {formatCurrency(stats.invested, hidden)}
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Total acumulado em investimentos e reservas.</p>
      </Card>

      {/* Modal Sonhos */}
      <Modal isOpen={!!editingGoal} onClose={() => setEditingGoal(null)} title="Meta de Sonho">
         <div className="space-y-4">
            <Input 
               label="Nome do Sonho" 
               // @ts-ignore
               value={editingGoal?.name || ''} 
               // @ts-ignore
               onChange={e => setEditingGoal({...editingGoal, name: e.target.value})}
            />
            <Input 
               label="Valor Alvo (R$)" 
               type="number"
               // @ts-ignore
               value={editingGoal?.target_amount || editingGoal?.target || ''} 
               // @ts-ignore
               onChange={e => setEditingGoal({...editingGoal, target: e.target.value})}
            />
            <Input 
               label="Valor Atual Guardado (R$)" 
               type="number"
               // @ts-ignore
               value={editingGoal?.current_amount || editingGoal?.current || ''} 
               // @ts-ignore
               onChange={e => setEditingGoal({...editingGoal, current: e.target.value})}
            />
            <Button onClick={handleGoalSave} className="w-full">Salvar Sonho</Button>
         </div>
      </Modal>

      <Modal isOpen={!!editingBudget} onClose={() => setEditingBudget(null)} title="Definir Meta de Gasto Mensal">
         <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">Categoria: <strong>{editingBudget?.cat}</strong></p>
            <Input 
               label="Limite Máximo (R$)" 
               type="number"
               value={editingBudget?.val || ''} 
               onChange={e => setEditingBudget(prev => prev ? {...prev, val: e.target.value} : null)}
            />
            <Button onClick={handleBudgetSave} className="w-full">Salvar Meta</Button>
         </div>
      </Modal>
    </div>
  );
};

// ... Investments Page ...
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

  // Prepare Evolution Data
  const evolutionData = useMemo(() => {
     // Flatten all history items
     const allOps: {date: string, amount: number}[] = [];
     filteredInvestments.forEach(inv => {
        inv.history.forEach(h => {
           allOps.push({ date: h.date, amount: h.amount });
        });
     });
     
     // Sort by date
     allOps.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
     
     // Accumulate
     let currentTotal = 0;
     const dataPoints: {date: string, value: number}[] = [];
     
     allOps.forEach(op => {
        currentTotal += op.amount;
        dataPoints.push({
           date: new Date(op.date).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'}),
           value: currentTotal
        });
     });
     
     // Simplify graph (take last 20 points if too many)
     if (dataPoints.length > 20) {
        return dataPoints.slice(dataPoints.length - 20);
     }
     return dataPoints;
  }, [filteredInvestments]);

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-lg">
            <div className="flex items-center gap-3 mb-2 opacity-90">
              <IconShield className="w-6 h-6" />
              <h3 className="font-semibold text-lg">Reserva de Emergência</h3>
            </div>
            <p className="text-3xl font-bold">
              {formatCurrency(emergencyFund.reduce((acc, i) => acc + i.currentAmount, 0), hidden)}
            </p>
            <p className="text-sm opacity-75 mt-2">Proteção para imprevistos</p>
         </Card>
         <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-none shadow-lg">
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

      <Card>
         <h3 className="font-bold text-slate-800 dark:text-white mb-4">Evolução Patrimonial</h3>
         <EvolutionChart data={evolutionData} hidden={hidden} />
      </Card>

      {/* Add Form */}
      {currentUser === 'Ambos' ? (
        <Card className="bg-slate-50 dark:bg-slate-800 border-dashed border-2 border-slate-200 dark:border-slate-600 text-center py-8">
           <p className="text-slate-500 dark:text-slate-400 font-medium">Selecione o perfil de <span className="text-blue-600 font-bold">Thiago</span> ou <span className="text-pink-600 font-bold">Marcela</span> para adicionar investimentos.</p>
        </Card>
      ) : (
        <Card>
          <h3 className="font-bold text-slate-800 dark:text-white mb-4">Novo Investimento / Aplicação ({currentUser})</h3>
          <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <Input label="Nome" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ex: Tesouro Selic, CDB..." />
            </div>
            <div className="w-full md:w-32">
              <div className="flex flex-col gap-1 w-full">
                <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Tipo</label>
                <select 
                  value={form.type} 
                  onChange={e => setForm({...form, type: e.target.value as InvestmentType})}
                  className="border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-white w-full outline-none"
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
              <div className={`text-xs px-2 py-1 rounded-full ${inv.type === 'emergencia' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'}`}>
                {inv.type === 'emergencia' ? 'Emergência' : 'Investimento'}
              </div>
              <button onClick={() => onDelete(inv.id)} disabled={isLoading} className="text-slate-300 hover:text-red-500 disabled:opacity-50">
                <IconTrash className="w-4 h-4" />
              </button>
            </div>
            <h4 className="font-bold text-lg text-slate-800 dark:text-white">{inv.name}</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Gerido por: {inv.user}</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(inv.currentAmount, hidden)}</p>
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
        <div className="inline-flex items-center justify-center p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400 mb-2">
          <IconBrain className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Consultor Financeiro AI ({currentUser})</h2>
        <p className="text-slate-500 dark:text-slate-400">Utilize a inteligência artificial para analisar seus gastos e receber dicas personalizadas.</p>
      </div>

      <div className="flex justify-center">
        <Button onClick={handleConsult} disabled={loading} className="w-full md:w-auto px-8 bg-purple-600 hover:bg-purple-700">
          {loading ? 'Analisando...' : 'Gerar Análise Financeira'}
        </Button>
      </div>
      
      {advice && (
        <Card className="prose prose-slate dark:prose-invert max-w-none bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900">
           <div dangerouslySetInnerHTML={{ __html: advice.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
        </Card>
      )}
    </div>
  );
};

const SettingsPage = ({
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onToggleEssential,
  onRestoreDefaults,
  isDarkMode,
  toggleDarkMode
}: {
  categories: Category[];
  onAddCategory: (name: string, type: string) => void;
  onUpdateCategory: (id: string, oldName: string, newName: string) => void;
  onDeleteCategory: (id: string, name: string) => void;
  onToggleEssential: (id: string, current: boolean) => void;
  onRestoreDefaults: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}) => {
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('despesa');
  const [viewType, setViewType] = useState<'receita' | 'despesa'>('despesa');
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
     sessionStorage.removeItem('app_authenticated');
     window.location.reload();
  };
  
  const displayedCategories = categories.filter(c => c.type === viewType).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
         <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
               Aparência
            </h3>
            <button 
               onClick={toggleDarkMode}
               className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
               {isDarkMode ? <><IconSun className="w-5 h-5"/> Modo Claro</> : <><IconMoon className="w-5 h-5"/> Modo Escuro</>}
            </button>
         </div>
      </Card>

      <Card>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
           Status do Sistema
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Este aplicativo está conectado à nuvem (Supabase). Seus dados estão sincronizados automaticamente.
        </p>
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
           Sincronização Ativa
        </div>
      </Card>
      
      <Card>
         <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Gerenciar Categorias</h3>
            <button 
               onClick={onRestoreDefaults}
               className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 underline"
            >
               Restaurar Categorias Padrão
            </button>
         </div>
         
         <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg mb-8 border border-slate-100 dark:border-slate-700">
             <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Adicionar Nova Categoria</h4>
             <div className="flex flex-col md:flex-row gap-2">
                <input 
                  type="text" 
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="Nome da categoria..."
                  className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                />
                <select 
                  value={newCatType}
                  onChange={e => setNewCatType(e.target.value)}
                  className="border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                >
                  <option value="despesa">Despesa</option>
                  <option value="receita">Receita</option>
                </select>
                <Button onClick={handleCreate} disabled={!newCatName} className="py-2 text-sm">Adicionar</Button>
             </div>
         </div>

         <div className="flex gap-2 mb-4">
             <button 
                onClick={() => setViewType('despesa')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${viewType === 'despesa' ? 'bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
             >
                Despesas
             </button>
             <button 
                onClick={() => setViewType('receita')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${viewType === 'receita' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
             >
                Receitas
             </button>
         </div>

         <div className="space-y-2">
             {displayedCategories.map(c => (
                <div key={c.id} className="flex justify-between items-center bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 rounded-lg hover:shadow-sm transition-shadow group">
                   <div className="flex items-center gap-3">
                      {c.is_system && <span title="Categoria do Sistema"><IconShield className="w-4 h-4 text-slate-300 dark:text-slate-600" /></span>}
                      {c.is_essential && <span title="Categoria Essencial"><IconStar className="w-4 h-4 text-yellow-500" /></span>}
                      <span className="text-slate-800 dark:text-slate-200 font-medium">{c.name}</span>
                   </div>
                   <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      {c.type === 'despesa' && (
                         <button
                            onClick={() => onToggleEssential(c.id, !!c.is_essential)}
                            className={`p-1 rounded ${c.is_essential ? 'text-yellow-500' : 'text-slate-300 hover:text-yellow-500'}`}
                            title={c.is_essential ? 'Remover de Essencial' : 'Marcar como Essencial'}
                         >
                            <IconStar className="w-4 h-4" />
                         </button>
                      )}
                      <button 
                         onClick={() => setEditingCat({id: c.id, name: c.name, oldName: c.name})}
                         className="text-slate-400 hover:text-blue-500 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
                         title="Renomear"
                      >
                         <IconEdit className="w-4 h-4" />
                      </button>
                      {!c.is_system && (
                         <button 
                            onClick={() => onDeleteCategory(c.id, c.name)}
                            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
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
      
      <Modal isOpen={!!editingCat} onClose={() => setEditingCat(null)} title="Renomear Categoria">
         <div className="space-y-4">
             <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 p-3 rounded text-sm">
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
         <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Conta</h3>
         <Button onClick={handleLogout} variant="danger" className="w-full">
           Sair do Aplicativo
         </Button>
      </Card>
    </div>
  );
};

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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
         <Card className="w-full max-w-md">
            <div className="text-center mb-6">
               <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Finova
               </h1>
               <p className="text-slate-500">Thiago & Marcela</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
               <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Senha de Acesso</label>
                  <input 
                     type="password" 
                     className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                     value={password}
                     onChange={e => { setPassword(e.target.value); setError(false); }}
                     placeholder="Digite a senha..."
                     autoFocus
                     autoComplete="new-password"
                  />
               </div>
               {error && <p className="text-red-500 text-sm">Senha incorreta.</p>}
               <Button className="w-full py-3" onClick={() => {}}>Entrar</Button>
            </form>
         </Card>
      </div>
   );
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // App State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'investments' | 'advisor' | 'settings'>('dashboard');
  const [currentUser, setCurrentUser] = useState<User>('Ambos');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Privacy Mode
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState(false);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
     // Session storage instead of local storage ensures logout on browser close
     const auth = sessionStorage.getItem('app_authenticated');
     if (auth === 'true') setIsAuthenticated(true);
     
     // Check Dark Mode preference (keep local as preference)
     const darkPref = localStorage.getItem('app_dark_mode');
     if (darkPref === 'true') setIsDarkMode(true);
     
     setCheckingAuth(false);
  }, []);

  const toggleDarkMode = () => {
     const newMode = !isDarkMode;
     setIsDarkMode(newMode);
     localStorage.setItem('app_dark_mode', String(newMode));
  };

  const handleLogin = () => {
     sessionStorage.setItem('app_authenticated', 'true');
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
  
  const handleCancelUnlock = () => {
     setUnlockModalOpen(false);
     setUnlockPassword('');
     setUnlockError(false);
  };

  // Load Data
  const fetchData = async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data: transData } = await supabase.from('transactions').select('*').order('date', { ascending: false });
      const { data: invData } = await supabase.from('investments').select('*');
      const { data: catData } = await supabase.from('categories').select('*');
      const { data: saveData } = await supabase.from('savings_goals').select('*');
      
      // Migration Logic
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
         const { data: insertedData } = await supabase.from('categories').insert(missingDefaults).select();
         if (insertedData) finalCategories = [...finalCategories, ...insertedData];
      }
      setCategories(finalCategories);

      const { data: budData } = await supabase.from('budgets').select('*');

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
      if (saveData) setSavingsGoals(saveData);

    } catch (err: any) {
      console.error(err);
      // Ignorar erros de tabela inexistente no início
      if (err.message && (err.message.includes('savings_goals') || err.message.includes('404'))) {
         // Silently fail for new features
      } else {
         setError('Erro ao carregar dados. Verifique conexão.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAuthenticated]);

  const handleAddTransaction = async (t: Omit<Transaction, 'id'>) => {
     const transactionsToInsert = [];
     const months = (t.is_recurring && t.recurring_months && t.recurring_months > 0) ? t.recurring_months : 1;
     for (let i = 0; i < months; i++) {
        const dateObj = new Date(t.date);
        dateObj.setMonth(dateObj.getMonth() + i);
        transactionsToInsert.push({ ...t, date: dateObj.toISOString().split('T')[0] });
     }
     const { data } = await supabase.from('transactions').insert(transactionsToInsert).select();
     if (data) setTransactions(prev => [...prev, ...data as Transaction[]]);
  };
  const handleUpdateTransaction = async (id: string, u: Partial<Transaction>) => {
     await supabase.from('transactions').update(u).eq('id', id);
     setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...u } : t));
  };
  const handleDeleteTransaction = async (id: string) => {
     if (!confirm('Excluir?')) return;
     await supabase.from('transactions').delete().eq('id', id);
     setTransactions(prev => prev.filter(t => t.id !== id));
  };
  const handleToggleStatus = async (id: string, s: boolean) => {
     await supabase.from('transactions').update({ is_paid: !s }).eq('id', id);
     setTransactions(prev => prev.map(t => t.id === id ? { ...t, is_paid: !s } : t));
  };

  const handleAddCategory = async (name: string, type: string) => {
     const { data } = await supabase.from('categories').insert([{ name, type, is_system: false }]).select();
     if (data) setCategories(prev => [...prev, data[0]]);
  };
  const handleUpdateCategory = async (id: string, oldName: string, newName: string) => {
     await supabase.from('categories').update({ name: newName }).eq('id', id);
     await supabase.from('transactions').update({ category: newName }).eq('category', oldName);
     setCategories(prev => prev.map(c => c.id === id ? { ...c, name: newName } : c));
     setTransactions(prev => prev.map(t => t.category === oldName ? { ...t, category: newName } : t));
  };
  const handleDeleteCategory = async (id: string, name: string) => {
     if (transactions.some(t => t.category === name)) { alert('Em uso.'); return; }
     if (!confirm('Excluir?')) return;
     await supabase.from('categories').delete().eq('id', id);
     setCategories(prev => prev.filter(c => c.id !== id));
  };
  const handleToggleEssential = async (id: string, current: boolean) => {
     const { error } = await supabase.from('categories').update({ is_essential: !current }).eq('id', id);
     if (!error) {
        setCategories(prev => prev.map(c => c.id === id ? { ...c, is_essential: !current } : c));
     }
  };
  const handleRestoreDefaults = async () => {
     if (!confirm('Restaurar padrões?')) return;
     alert('Reinicie o app para aplicar.');
  };

  const handleUpdateBudget = async (cat: string, lim: number) => {
     const existing = budgets.find(b => b.category === cat);
     if (existing) {
        if (lim === 0) {
           await supabase.from('budgets').delete().eq('id', existing.id);
           setBudgets(prev => prev.filter(b => b.id !== existing.id));
        } else {
           await supabase.from('budgets').update({ limit_amount: lim }).eq('id', existing.id);
           setBudgets(prev => prev.map(b => b.id === existing.id ? { ...b, limit_amount: lim } : b));
        }
     } else {
        const { data } = await supabase.from('budgets').insert([{ category: cat, limit_amount: lim }]).select();
        if (data) setBudgets(prev => [...prev, data[0]]);
     }
  };

  const handleUpdateSavings = async (name: string, target: number, current: number) => {
     const existing = savingsGoals.find(g => g.name === name);
     if (existing) {
        const { error } = await supabase.from('savings_goals').update({ target_amount: target, current_amount: current }).eq('id', existing.id);
        if(!error) setSavingsGoals(prev => prev.map(g => g.id === existing.id ? {...g, target_amount: target, current_amount: current} : g));
     } else {
        const { data } = await supabase.from('savings_goals').insert([{ name, target_amount: target, current_amount: current, user: 'Ambos' }]).select();
        if(data) setSavingsGoals(prev => [...prev, data[0]]);
     }
  };

  const handleAddInvestment = async (inv: any, amount: number) => {
     const historyItem = { id: crypto.randomUUID(), date: new Date().toISOString(), amount, type: 'aporte' };
     const { data } = await supabase.from('investments').insert([{ ...inv, current_amount: amount, history: [historyItem] }]).select();
     if (data) {
        setInvestments(prev => [...prev, { ...data[0], id: data[0].id, currentAmount: data[0].current_amount }]);
     }
  };
  const handleDeleteInvestment = async (id: string) => {
     if (!confirm('Excluir?')) return;
     await supabase.from('investments').delete().eq('id', id);
     setInvestments(prev => prev.filter(i => i.id !== id));
  };

  const stats = useMemo(() => {
     const filteredT = transactions.filter(t => currentUser === 'Ambos' ? true : t.user === currentUser);
     const filteredI = investments.filter(i => currentUser === 'Ambos' ? true : i.user === currentUser);
     const income = filteredT.filter(t => t.type === 'receita').reduce((acc, t) => acc + t.amount, 0);
     const expenses = filteredT.filter(t => t.type === 'despesa').reduce((acc, t) => acc + t.amount, 0);
     const invested = filteredI.reduce((acc, i) => acc + i.currentAmount, 0);
     return { income, expenses, balance: income - expenses, invested };
  }, [transactions, investments, currentUser]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage transactions={transactions} stats={stats} budgets={budgets} categories={categories} onUpdateBudget={handleUpdateBudget} savingsGoals={savingsGoals} onUpdateSavings={handleUpdateSavings} currentDate={currentDate} onMonthChange={setCurrentDate} currentUser={currentUser} hidden={isPrivacyMode} />;
      case 'transactions':
        return <TransactionsPage transactions={transactions} onAdd={handleAddTransaction} onUpdate={handleUpdateTransaction} onDelete={handleDeleteTransaction} onToggleStatus={handleToggleStatus} isLoading={isLoading} categories={categories} currentDate={currentDate} onMonthChange={setCurrentDate} onGenerateRecurring={() => {}} currentUser={currentUser} hidden={isPrivacyMode} />;
      case 'investments':
        return <InvestmentsPage investments={investments} onAdd={handleAddInvestment} onDelete={handleDeleteInvestment} isLoading={isLoading} currentUser={currentUser} hidden={isPrivacyMode} />;
      case 'advisor':
        return <AdvisorPage transactions={transactions} investments={investments} currentUser={currentUser} />;
      case 'settings':
        return <SettingsPage categories={categories} onAddCategory={handleAddCategory} onUpdateCategory={handleUpdateCategory} onDeleteCategory={handleDeleteCategory} onToggleEssential={handleToggleEssential} onRestoreDefaults={handleRestoreDefaults} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />;
      default: return null;
    }
  };

  if (checkingAuth) return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Carregando...</div>;
  if (!isAuthenticated) return <LoginPage onLogin={handleLogin} />;

  const getMainBackground = () => {
    if (isDarkMode) return 'dark bg-slate-900 text-slate-100';
    if (currentUser === 'Thiago') return 'bg-blue-50/50';
    if (currentUser === 'Marcela') return 'bg-pink-50/50';
    return 'bg-slate-50';
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row font-sans transition-colors duration-500 ${isDarkMode ? 'dark bg-slate-900' : getMainBackground()}`}>
      <aside className={`
        bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-shrink-0 z-50
        md:w-64 md:h-screen md:sticky md:top-0 
        w-full fixed top-0 left-0 shadow-sm md:shadow-none
        ${mobileMenuOpen ? 'h-screen' : 'h-auto'}
      `}>
        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Finova
            </h1>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wide">Thiago & Marcela</p>
          </div>
          <button className="md:hidden text-slate-600 dark:text-slate-400 p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
             {mobileMenuOpen ? <IconClose /> : <IconMenu />}
          </button>
        </div>
        
        <nav className={`p-4 space-y-2 bg-white dark:bg-slate-900 ${mobileMenuOpen ? 'block' : 'hidden'} md:block`}>
          <NavButton active={activeTab === 'dashboard'} onClick={() => handleNavClick('dashboard')} icon={<IconPieChart />} label="Visão Geral" />
          <NavButton active={activeTab === 'transactions'} onClick={() => handleNavClick('transactions')} icon={<IconList />} label="Transações" />
          <NavButton active={activeTab === 'investments'} onClick={() => handleNavClick('investments')} icon={<IconTrendingUp />} label="Investimentos" />
          <NavButton active={activeTab === 'advisor'} onClick={() => handleNavClick('advisor')} icon={<IconBrain />} label="Consultor AI" special />
          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
            <NavButton active={activeTab === 'settings'} onClick={() => handleNavClick('settings')} icon={<IconSettings />} label="Configurações" />
          </div>
        </nav>
      </aside>

      <main className="flex-1 p-4 md:p-8 pt-24 md:pt-8 overflow-y-auto">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white capitalize">
              {activeTab === 'advisor' ? 'Consultor AI' : activeTab === 'dashboard' ? 'Painel de Controle' : activeTab === 'settings' ? 'Configurações' : activeTab}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
               Visualizando dados de: <strong className="text-slate-700 dark:text-slate-300">{currentUser === 'Ambos' ? 'Geral (Thiago + Marcela)' : currentUser}</strong>
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
               <button onClick={() => setCurrentUser('Ambos')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentUser === 'Ambos' ? 'bg-white dark:bg-white text-slate-900 shadow-md border border-slate-200' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Geral</button>
               <button onClick={() => setCurrentUser('Thiago')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentUser === 'Thiago' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/30'}`}>Thiago</button>
               <button onClick={() => setCurrentUser('Marcela')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentUser === 'Marcela' ? 'bg-pink-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-pink-50 dark:hover:bg-pink-900/30'}`}>Marcela</button>
            </div>
            <button onClick={togglePrivacy} className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-blue-600 transition-colors">
               {isPrivacyMode ? <IconEyeOff className="w-5 h-5" /> : <IconEye className="w-5 h-5" />}
            </button>
          </div>
        </header>
        {renderContent()}
      </main>
      
      <Modal isOpen={unlockModalOpen} onClose={handleCancelUnlock} title="Desbloquear Visualização">
         <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">Digite a senha do aplicativo para visualizar os valores.</p>
            <Input label="Senha" type="password" value={unlockPassword} onChange={e => { setUnlockPassword(e.target.value); setUnlockError(false); }} placeholder="Digite a senha..." />
            {unlockError && <p className="text-red-500 text-sm">Senha incorreta.</p>}
            <div className="flex gap-2">
               <Button onClick={handleCancelUnlock} variant="secondary" className="w-full">Cancelar</Button>
               <Button onClick={handleUnlock} className="w-full">Desbloquear</Button>
            </div>
         </div>
      </Modal>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label, special = false }: { active: boolean; onClick: () => void; icon: React.ReactElement; label: string; special?: boolean; }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${active ? special ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' : 'bg-white dark:bg-blue-700 text-slate-900 dark:text-white border border-slate-200 dark:border-none shadow-sm dark:shadow-none' : special ? 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
    {React.cloneElement(icon as React.ReactElement<any>, { className: "w-5 h-5" })}
    {label}
  </button>
);

export default App;
