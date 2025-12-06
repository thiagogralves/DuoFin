
import React, { useState, useEffect, useMemo } from 'react';
import { 
  IconTrendingUp, IconTrendingDown, IconWallet, 
  IconPieChart, IconList, IconPlus, IconTrash, IconBrain, IconShield, IconSettings, IconCalendar, IconRefresh, IconTarget, IconClose, IconMenu, IconEdit, IconEye, IconEyeOff, IconCheck, IconClock, IconSearch, IconDownload, IconFileText, IconSun, IconMoon, IconActivity, IconTrophy, IconStar, IconBarChartHorizontal
} from './components/Icons';
import { Card, Button, Input, Select, formatCurrency, Modal, ProgressBar } from './components/UI';
import { MonthlyChart, CategoryChart, EvolutionChart, SemestralChart, LifestyleChart, UserDistChart, TopOffendersChart } from './components/Charts';
import { Transaction, Investment, User, InvestmentType, TransactionType, Budget, Category, PaymentMethod, SavingsGoal, AdviceHistoryItem } from './types';
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

// --- Extracted Form Component to fix Focus Loss ---
const AddTransactionForm = ({
  form,
  setForm,
  onSubmit,
  isLoading,
  availableCategories
}: {
  form: any;
  setForm: (f: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  availableCategories: string[];
}) => {
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
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
          onChange={e => setForm({...form, type: e.target.value as TransactionType})}
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
};

// --- Calendar Component for Advisor Page ---
const ReportCalendar = ({ 
  datesWithReports, 
  selectedDate, 
  onSelectDate,
  currentViewDate,
  onViewDateChange
}: { 
  datesWithReports: string[]; 
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  currentViewDate: Date;
  onViewDateChange: (d: Date) => void;
}) => {
  
  const daysInMonth = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() + 1, 0).getDate();
  const startDay = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth(), 1).getDay(); // 0 = Sunday
  
  // Adjust so Monday is 0
  const startDayAdjusted = startDay === 0 ? 6 : startDay - 1;

  const handlePrevMonth = () => {
     const d = new Date(currentViewDate);
     d.setMonth(d.getMonth() - 1);
     onViewDateChange(d);
  };

  const handleNextMonth = () => {
     const d = new Date(currentViewDate);
     d.setMonth(d.getMonth() + 1);
     onViewDateChange(d);
  };

  const days = [];
  for (let i = 0; i < startDayAdjusted; i++) {
     days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
     days.push(i);
  }

  const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  return (
     <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-4">
        <div className="flex justify-between items-center mb-4">
           <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500">
              ◄
           </button>
           <h3 className="font-bold text-slate-800 dark:text-white capitalize">
              {currentViewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
           </h3>
           <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500">
              ►
           </button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
           {weekDays.map(d => (
              <span key={d} className="text-xs font-bold text-slate-400 uppercase">{d}</span>
           ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
           {days.map((day, index) => {
              if (day === null) return <div key={`empty-${index}`} className="aspect-square"></div>;
              
              // Format YYYY-MM-DD
              const dateStr = `${currentViewDate.getFullYear()}-${String(currentViewDate.getMonth()+1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const hasReport = datesWithReports.includes(dateStr);
              const isSelected = selectedDate === dateStr;

              return (
                 <button
                    key={day}
                    disabled={!hasReport}
                    onClick={() => onSelectDate(dateStr)}
                    className={`
                       aspect-square rounded-full flex items-center justify-center text-sm font-medium transition-all relative
                       ${hasReport ? 'hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer text-slate-800 dark:text-white' : 'text-slate-300 dark:text-slate-600 cursor-default'}
                       ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md scale-105' : ''}
                    `}
                 >
                    {day}
                    {hasReport && !isSelected && (
                       <div className="absolute bottom-1 w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    )}
                 </button>
              );
           })}
        </div>
        <div className="mt-4 flex items-center gap-2 justify-center text-xs text-slate-400">
           <div className="w-2 h-2 bg-emerald-500 rounded-full"></div> Relatório Disponível
        </div>
     </div>
  );
};

// --- ADVISOR PAGE WITH SUPABASE & CALENDAR ---

const AdvisorPage = ({ transactions, investments, currentUser }: { transactions: Transaction[], investments: Investment[], currentUser: User }) => {
  const [history, setHistory] = useState<AdviceHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  
  // Calendar State
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());

  // Helper: Get the date of the Monday of the current week
  const getMonday = (d: Date) => {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(d);
    monday.setDate(diff);
    return monday;
  };

  const currentMondayStr = getMonday(new Date()).toISOString().split('T')[0];

  useEffect(() => {
    fetchHistory();
  }, [transactions, investments]);

  const fetchHistory = async () => {
     try {
        const { data, error } = await supabase.from('advice_history').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        
        if (data) {
           setHistory(data);
           // Auto select latest
           if (data.length > 0 && !selectedReportId) {
              setSelectedReportId(data[0].id);
           }
           
           // Check for auto-generate
           const hasReportForThisWeek = data.some((h: any) => h.week_of === currentMondayStr);
           if (!hasReportForThisWeek && !loading) {
              generateAdvice(data);
           }
        }
     } catch (err) {
        console.error("Erro ao buscar histórico:", err);
     }
  };

  const generateAdvice = async (currentHistory: AdviceHistoryItem[]) => {
    setLoading(true);
    const result = await getFinancialAdvice(transactions, investments);
    
    const newItem = {
      week_of: currentMondayStr,
      content: result
    };
    
    // Save to DB
    const { data, error } = await supabase.from('advice_history').insert([newItem]).select();
    
    if (data && !error) {
       const newHistoryItem = data[0] as AdviceHistoryItem;
       setHistory([newHistoryItem, ...currentHistory]);
       setSelectedReportId(newHistoryItem.id);
    }
    setLoading(false);
  };

  const handleForceRegenerate = () => {
     if (confirm('Deseja forçar uma nova análise agora? Isso consumirá créditos da IA.')) {
        generateAdvice(history);
     }
  };

  const selectedReport = history.find(h => h.id === selectedReportId);

  // Map dates (week_of) to allow calendar lookup
  const datesWithReports = useMemo(() => {
     return history.map(h => h.week_of);
  }, [history]);
  
  const handleDateSelect = (dateStr: string) => {
     const report = history.find(h => h.week_of === dateStr);
     if (report) setSelectedReportId(report.id);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400 mb-2 animate-bounce">
          <IconBrain className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Consultoria Financeira Automática</h2>
        <p className="text-slate-600 dark:text-slate-300 max-w-lg mx-auto">
           A Inteligência Artificial analisa suas finanças toda semana. Aqui você encontra o histórico de relatórios para acompanhar sua evolução a curto, médio e longo prazo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
         
         {/* Left Column: Controls & Calendar */}
         <div className="space-y-6">
            <div className="flex justify-between items-center bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800">
               <div className="flex flex-col">
                  <span className="text-xs text-purple-600 uppercase font-bold mb-1">Status da IA</span>
                  {loading ? (
                     <span className="text-sm font-bold text-purple-600 animate-pulse flex items-center gap-2">
                        <IconRefresh className="w-4 h-4 animate-spin"/> Gerando análise...
                     </span>
                  ) : (
                     <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                        Atualizado
                     </span>
                  )}
               </div>
               {!loading && (
                  <button onClick={handleForceRegenerate} className="text-xs bg-white dark:bg-purple-800 text-purple-600 dark:text-white border border-purple-200 dark:border-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors shadow-sm">
                     Forçar Análise
                  </button>
               )}
            </div>

            <ReportCalendar 
               datesWithReports={datesWithReports}
               selectedDate={selectedReport ? selectedReport.week_of : null}
               onSelectDate={handleDateSelect}
               currentViewDate={calendarViewDate}
               onViewDateChange={setCalendarViewDate}
            />
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200">
               <p className="font-bold mb-1 flex items-center gap-2"><IconTrendingUp className="w-4 h-4"/> Dica</p>
               <p>Os relatórios são gerados automaticamente toda segunda-feira baseados nos dados lançados até o momento.</p>
            </div>
         </div>

         {/* Right Column: Report Content */}
         <div className="md:col-span-2">
            {selectedReport ? (
               <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                     <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Relatório da Semana</h3>
                        <p className="text-slate-500 text-sm">Referência: {new Date(selectedReport.week_of).toLocaleDateString('pt-BR')}</p>
                     </div>
                     <div className="bg-white dark:bg-slate-800 p-2 rounded-full shadow-sm">
                        <IconFileText className="w-6 h-6 text-purple-500" />
                     </div>
                  </div>
                  
                  {/* CSS Fix for readable text in light mode applied via prose classes + specific overrides */}
                  <div className="p-6 md:p-8">
                      <div 
                        className="prose prose-slate max-w-none 
                                   prose-headings:text-slate-800 dark:prose-headings:text-white 
                                   prose-p:text-slate-600 dark:prose-p:text-slate-300 
                                   prose-strong:text-slate-800 dark:prose-strong:text-white
                                   prose-li:text-slate-600 dark:prose-li:text-slate-300"
                        dangerouslySetInnerHTML={{ 
                           __html: selectedReport.content
                              .replace(/\n/g, '<br/>')
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/### (.*?)(<br\/>|$)/g, '<h3 class="text-lg font-bold mt-6 mb-3 text-purple-600 flex items-center gap-2 border-b border-purple-100 dark:border-purple-900/30 pb-2">$1</h3>')
                              .replace(/## (.*?)(<br\/>|$)/g, '<div class="bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg mt-6 mb-3 border-l-4 border-purple-500"><h4 class="text-md font-bold text-slate-800 dark:text-white m-0">$1</h4></div>') 
                        }} 
                      />
                  </div>
               </div>
            ) : (
               <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
                  <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-full mb-4">
                     <IconCalendar className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-600 dark:text-slate-300">Nenhum relatório selecionado</h3>
                  <p className="text-slate-400 max-w-xs mx-auto mt-2">Selecione uma data marcada no calendário para visualizar a análise daquela semana.</p>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

// 2. Transactions List Component with Filters
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
           <AddTransactionForm 
             form={form} 
             setForm={setForm} 
             onSubmit={handleSubmit} 
             isLoading={isLoading} 
             availableCategories={availableCategories} 
           />
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
          <AddTransactionForm 
             form={form} 
             setForm={setForm} 
             onSubmit={handleSubmit} 
             isLoading={isLoading} 
             availableCategories={availableCategories} 
          />
       </Modal>
 
       <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden w-full">
         <div className="overflow-x-auto w-full">
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
             <SemestralChart transactions={userHistoryTransactions} hidden={hidden} currentDate={currentDate} />
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

// LoginPage Component
const LoginPage = ({ onLogin }: { onLogin: () => void }) => {
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pass === APP_PASSWORD) {
      sessionStorage.setItem('app_authenticated', 'true');
      onLogin();
    } else {
      setError('Senha incorreta');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4 font-sans">
      <Card className="w-full max-w-sm text-center p-8">
        <div className="mb-6 flex justify-center text-blue-600 dark:text-blue-400">
           <IconWallet className="w-12 h-12" />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-slate-800 dark:text-white">Finova</h1>
        <p className="text-slate-500 mb-6 text-sm">Finanças Pessoais Inteligentes</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
           <Input 
              label="Senha de Acesso" 
              type="password" 
              value={pass} 
              onChange={e => { setPass(e.target.value); setError(''); }} 
           />
           {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
           <Button className="w-full justify-center">Entrar</Button>
        </form>
      </Card>
    </div>
  );
};

// Main App Component
const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'investments' | 'advisor' | 'settings'>('dashboard');
  const [currentUser, setCurrentUser] = useState<User>('Ambos');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hidden, setHidden] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);

  // Auth & Theme Effects
  useEffect(() => {
    if (sessionStorage.getItem('app_authenticated') === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Data Loading
  useEffect(() => {
     if (!isAuthenticated) return;
     
     const fetchData = async () => {
        setIsLoading(true);
        try {
           const { data: tData } = await supabase.from('transactions').select('*');
           if (tData) setTransactions(tData);

           const { data: cData } = await supabase.from('categories').select('*');
           if (cData) setCategories(cData);

           const { data: iData } = await supabase.from('investments').select('*');
           if (iData) setInvestments(iData.map(i => ({...i, history: i.history || []})));

           const { data: bData } = await supabase.from('budgets').select('*');
           if (bData) setBudgets(bData);

           const { data: sData } = await supabase.from('savings_goals').select('*');
           if (sData) setSavingsGoals(sData);

        } catch (error) {
           console.error('Error fetching data:', error);
        } finally {
           setIsLoading(false);
        }
     };

     fetchData();
  }, [isAuthenticated]);

  // Handlers
  const handleAddTransaction = async (t: Omit<Transaction, 'id'>) => {
     setIsLoading(true);
     const { data } = await supabase.from('transactions').insert([t]).select();
     if (data) {
        setTransactions(prev => [data[0], ...prev]);
        // Simple Recurring Logic: Create copies for future months immediately
        if (t.is_recurring && t.recurring_months && t.recurring_months > 0) {
           const recurrences = [];
           for (let i = 1; i <= t.recurring_months; i++) {
              const d = new Date(t.date);
              d.setMonth(d.getMonth() + i);
              recurrences.push({
                 ...t,
                 date: d.toISOString().split('T')[0],
                 description: `${t.description} (${i}/${t.recurring_months})`
              });
           }
           const { data: rData } = await supabase.from('transactions').insert(recurrences).select();
           if (rData) setTransactions(prev => [...rData, ...prev]);
        }
     }
     setIsLoading(false);
  };

  const handleUpdateTransaction = async (id: string, updates: Partial<Transaction>) => {
     setIsLoading(true);
     const { error } = await supabase.from('transactions').update(updates).eq('id', id);
     if (!error) {
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
     }
     setIsLoading(false);
  };

  const handleDeleteTransaction = async (id: string) => {
     setIsLoading(true);
     const { error } = await supabase.from('transactions').delete().eq('id', id);
     if (!error) {
        setTransactions(prev => prev.filter(t => t.id !== id));
     }
     setIsLoading(false);
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
     const { error } = await supabase.from('transactions').update({ is_paid: !currentStatus }).eq('id', id);
     if (!error) {
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, is_paid: !currentStatus } : t));
     }
  };

  const handleAddInvestment = async (i: Omit<Investment, 'id' | 'history'>, initialAmount: number) => {
     setIsLoading(true);
     const newInv = { 
        ...i, 
        currentAmount: initialAmount,
        history: [{ date: new Date().toISOString(), amount: initialAmount, type: 'aporte' }] 
     };
     const { data } = await supabase.from('investments').insert([newInv]).select();
     if (data) setInvestments(prev => [...prev, data[0]]);
     setIsLoading(false);
  };

  const handleDeleteInvestment = async (id: string) => {
     setIsLoading(true);
     const { error } = await supabase.from('investments').delete().eq('id', id);
     if (!error) setInvestments(prev => prev.filter(i => i.id !== id));
     setIsLoading(false);
  };

  const handleAddCategory = async (name: string, type: string) => {
     const { data } = await supabase.from('categories').insert([{ name, type, is_system: false }]).select();
     if (data) setCategories(prev => [...prev, data[0]]);
  };

  const handleUpdateCategory = async (id: string, oldName: string, newName: string) => {
     const { error } = await supabase.from('categories').update({ name: newName }).eq('id', id);
     if (!error) {
        setCategories(prev => prev.map(c => c.id === id ? { ...c, name: newName } : c));
     }
  };

  const handleDeleteCategory = async (id: string) => {
     const { error } = await supabase.from('categories').delete().eq('id', id);
     if (!error) setCategories(prev => prev.filter(c => c.id !== id));
  };

  const handleToggleEssential = async (id: string, current: boolean) => {
     const { error } = await supabase.from('categories').update({ is_essential: !current }).eq('id', id);
     if (!error) setCategories(prev => prev.map(c => c.id === id ? { ...c, is_essential: !current } : c));
  };

  const handleUpdateBudget = async (category: string, limit_amount: number) => {
     const existing = budgets.find(b => b.category === category);
     if (existing) {
        const { error } = await supabase.from('budgets').update({ limit_amount }).eq('id', existing.id);
        if (!error) setBudgets(prev => prev.map(b => b.id === existing.id ? { ...b, limit_amount } : b));
     } else {
        const { data } = await supabase.from('budgets').insert([{ category, limit_amount }]).select();
        if (data) setBudgets(prev => [...prev, data[0]]);
     }
  };

  const handleUpdateSavings = async (name: string, target_amount: number, current_amount: number) => {
     const existing = savingsGoals.find(s => s.name === name);
     if (existing) {
        const { error } = await supabase.from('savings_goals').update({ target_amount, current_amount }).eq('id', existing.id);
        if (!error) setSavingsGoals(prev => prev.map(s => s.id === existing.id ? { ...s, target_amount, current_amount } : s));
     } else {
        const { data } = await supabase.from('savings_goals').insert([{ name, target_amount, current_amount, user: currentUser }]).select();
        if (data) setSavingsGoals(prev => [...prev, data[0]]);
     }
  };
  
  const handleRestoreDefaults = async () => {
     if(!confirm('Recriar categorias padrão?')) return;
  };

  const stats = {
     invested: investments.reduce((acc, i) => acc + i.currentAmount, 0)
  };

  const handleNavClick = (tabId: any) => {
     setActiveTab(tabId);
     setIsSidebarOpen(false); // Close sidebar on mobile on click
  };

  if (!isAuthenticated) return <LoginPage onLogin={() => setIsAuthenticated(true)} />;

  const NavItem = ({ id, icon: Icon, label }: any) => (
     <button 
       onClick={() => handleNavClick(id)}
       className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all ${activeTab === id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 dark:hover:text-slate-200'}`}
     >
       <Icon className="w-5 h-5" />
       <span className="text-sm font-medium">{label}</span>
     </button>
  );

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 transition-colors md:pl-64 font-sans overflow-x-hidden">
       {/* Sidebar / Drawer */}
       <>
         {/* Mobile Overlay */}
         {isSidebarOpen && (
            <div 
               className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
               onClick={() => setIsSidebarOpen(false)}
            />
         )}

         {/* Sidebar Content */}
         <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-6 transform transition-transform duration-300 ease-in-out md:translate-x-0 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="flex items-center justify-between mb-10 text-blue-600 dark:text-blue-400">
               <div className="flex items-center gap-3">
                  <IconWallet className="w-8 h-8" />
                  <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Finova</h1>
               </div>
               <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600">
                  <IconClose className="w-6 h-6" />
               </button>
            </div>
            
            <nav className="space-y-2 flex-1">
               <NavItem id="dashboard" icon={IconPieChart} label="Dashboard" />
               <NavItem id="transactions" icon={IconList} label="Movimentações" />
               <NavItem id="investments" icon={IconTrendingUp} label="Investimentos" />
               <NavItem id="advisor" icon={IconBrain} label="Consultor IA" />
               <NavItem id="settings" icon={IconSettings} label="Ajustes" />
            </nav>

            <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-700">
               <div className="flex items-center gap-3 px-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold">
                     {currentUser.charAt(0)}
                  </div>
                  <div className="flex-1 overflow-hidden">
                     <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">Olá, {currentUser}</p>
                     <button onClick={() => setIsAuthenticated(false)} className="text-xs text-slate-400 hover:text-red-500">Sair</button>
                  </div>
               </div>
            </div>
         </aside>
       </>

       {/* Main Content */}
       <main className="p-4 md:p-8 max-w-7xl mx-auto w-full">
          <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
             <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-start relative">
                <button 
                   onClick={() => setIsSidebarOpen(true)}
                   className="md:hidden absolute left-0 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                   <IconMenu className="w-6 h-6" />
                </button>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white capitalize text-center w-full md:w-auto md:text-left">
                   {activeTab === 'advisor' ? 'Consultor Financeiro IA' : activeTab === 'dashboard' ? 'Visão Geral' : activeTab === 'transactions' ? 'Movimentações' : activeTab === 'investments' ? 'Carteira' : 'Configurações'}
                </h1>
             </div>
             <div className="flex items-center gap-2 md:gap-4 justify-center w-full md:w-auto">
                <button 
                   onClick={() => setHidden(!hidden)} 
                   className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                   title={hidden ? "Mostrar Valores" : "Ocultar Valores"}
                >
                   {hidden ? <IconEyeOff className="w-5 h-5" /> : <IconEye className="w-5 h-5" />}
                </button>
                
                <div className="bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700 flex shadow-sm">
                   {USERS.map(u => (
                      <button 
                         key={u}
                         onClick={() => setCurrentUser(u as User)}
                         className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${currentUser === u ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                      >
                         {u}
                      </button>
                   ))}
                </div>
             </div>
          </header>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             {activeTab === 'dashboard' && (
                <DashboardPage 
                   transactions={transactions}
                   stats={stats}
                   budgets={budgets}
                   categories={categories}
                   onUpdateBudget={handleUpdateBudget}
                   savingsGoals={savingsGoals}
                   onUpdateSavings={handleUpdateSavings}
                   currentDate={currentDate}
                   onMonthChange={setCurrentDate}
                   currentUser={currentUser}
                   hidden={hidden}
                />
             )}
             {activeTab === 'transactions' && (
                <TransactionsPage 
                   transactions={transactions}
                   onAdd={handleAddTransaction}
                   onUpdate={handleUpdateTransaction}
                   onDelete={handleDeleteTransaction}
                   onToggleStatus={handleToggleStatus}
                   isLoading={isLoading}
                   categories={categories}
                   currentDate={currentDate}
                   onMonthChange={setCurrentDate}
                   onGenerateRecurring={() => alert('Em breve')}
                   currentUser={currentUser}
                   hidden={hidden}
                />
             )}
             {activeTab === 'investments' && (
                <InvestmentsPage 
                   investments={investments}
                   onAdd={handleAddInvestment}
                   onDelete={handleDeleteInvestment}
                   isLoading={isLoading}
                   currentUser={currentUser}
                   hidden={hidden}
                />
             )}
             {activeTab === 'advisor' && (
                <AdvisorPage 
                   transactions={transactions}
                   investments={investments}
                   currentUser={currentUser}
                />
             )}
             {activeTab === 'settings' && (
                <SettingsPage 
                   categories={categories}
                   onAddCategory={handleAddCategory}
                   onUpdateCategory={handleUpdateCategory}
                   onDeleteCategory={handleDeleteCategory}
                   onToggleEssential={handleToggleEssential}
                   onRestoreDefaults={handleRestoreDefaults}
                   isDarkMode={isDarkMode}
                   toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
                />
             )}
          </div>
       </main>
    </div>
  );
};

export default App;
