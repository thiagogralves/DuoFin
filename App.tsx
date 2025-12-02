import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  IconTrendingUp, IconTrendingDown, IconWallet, 
  IconPieChart, IconList, IconPlus, IconTrash, IconBrain, IconShield, IconSettings, IconDownload, IconUpload
} from './components/Icons';
import { Card, Button, Input, Select, formatCurrency } from './components/UI';
import { MonthlyChart, CategoryChart } from './components/Charts';
import { Transaction, Investment, User, InvestmentType, TransactionType } from './types';
import { USERS, CATEGORIES, APP_PASSWORD } from './constants';
import { getFinancialAdvice } from './services/geminiService';
import { supabase } from './services/supabase';

// --- Sub-components ---

// 1. Transactions List Component
const TransactionsPage = ({ 
  transactions, 
  onAdd, 
  onDelete,
  isLoading
}: { 
  transactions: Transaction[]; 
  onAdd: (t: Omit<Transaction, 'id'>) => void; 
  onDelete: (id: string) => void;
  isLoading: boolean;
}) => {
  const [form, setForm] = useState({
    description: '',
    amount: '',
    type: 'despesa' as TransactionType,
    category: CATEGORIES.EXPENSE[0],
    user: 'Ambos' as User,
    date: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || !form.amount) return;

    onAdd({
      description: form.description,
      amount: Number(form.amount),
      type: form.type,
      category: form.category,
      user: form.user,
      date: form.date
    });
    setForm({ ...form, description: '', amount: '' });
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as TransactionType;
    setForm({
      ...form,
      type: newType,
      category: newType === 'receita' ? CATEGORIES.INCOME[0] : CATEGORIES.EXPENSE[0]
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-l-4 border-l-blue-500">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <IconPlus className="w-5 h-5" /> Nova Movimentação
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Input 
            label="Descrição" 
            value={form.description} 
            onChange={e => setForm({...form, description: e.target.value})} 
            placeholder="Ex: Compra Mercado"
          />
          <Input 
            label="Valor (R$)" 
            type="number" 
            value={form.amount} 
            onChange={e => setForm({...form, amount: e.target.value})} 
            placeholder="0,00"
          />
           <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase text-slate-500">Data</label>
            <input 
              type="date" 
              value={form.date} 
              onChange={e => setForm({...form, date: e.target.value})}
              className="border border-slate-300 rounded-lg p-2 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase text-slate-500">Tipo</label>
            <select 
              value={form.type} 
              onChange={handleTypeChange}
              className="border border-slate-300 rounded-lg p-2 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="receita">Receita</option>
              <option value="despesa">Despesa</option>
            </select>
          </div>
          <Select 
            label="Categoria"
            value={form.category}
            onChange={e => setForm({...form, category: e.target.value})}
            options={form.type === 'receita' ? CATEGORIES.INCOME : CATEGORIES.EXPENSE}
          />
          <Select 
            label="Responsável"
            value={form.user}
            onChange={e => setForm({...form, user: e.target.value as User})}
            options={USERS}
          />
          <div className="lg:col-span-3 flex justify-end">
            <Button disabled={isLoading} className="w-full md:w-auto">
              {isLoading ? 'Salvando...' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </Card>

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
              {transactions.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                <tr key={t.id} className="border-b hover:bg-slate-50">
                  <td className="p-4 whitespace-nowrap">{new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                  <td className="p-4 font-medium text-slate-800 whitespace-nowrap">{t.description}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${t.user === 'Thiago' ? 'bg-blue-100 text-blue-700' : t.user === 'Marcela' ? 'bg-pink-100 text-pink-700' : 'bg-purple-100 text-purple-700'}`}>
                      {t.user}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500 whitespace-nowrap">{t.category}</td>
                  <td className={`p-4 text-right font-bold whitespace-nowrap ${t.type === 'receita' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.type === 'receita' ? '+' : '-'} {formatCurrency(t.amount)}
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => onDelete(t.id)} disabled={isLoading} className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50">
                      <IconTrash className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    {isLoading ? 'Carregando transações...' : 'Nenhuma transação encontrada.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 2. Investments Page Component
const InvestmentsPage = ({ 
  investments, 
  onAdd, 
  onDelete,
  isLoading
}: { 
  investments: Investment[]; 
  onAdd: (i: Omit<Investment, 'id' | 'history'>, initialAmount: number) => void; 
  onDelete: (id: string) => void;
  isLoading: boolean;
}) => {
  const [form, setForm] = useState({
    name: '',
    type: 'geral' as InvestmentType,
    amount: '',
    user: 'Ambos' as User
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.amount) return;
    
    onAdd({
      name: form.name,
      type: form.type,
      currentAmount: 0,
      user: form.user
    }, Number(form.amount));
    setForm({ ...form, name: '', amount: '' });
  };

  const emergencyFund = investments.filter(i => i.type === 'emergencia');
  const generalInvestments = investments.filter(i => i.type === 'geral');

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
              {formatCurrency(emergencyFund.reduce((acc, i) => acc + i.currentAmount, 0))}
            </p>
            <p className="text-sm opacity-75 mt-2">Proteção para imprevistos</p>
         </Card>
         <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-none">
            <div className="flex items-center gap-3 mb-2 opacity-90">
              <IconTrendingUp className="w-6 h-6" />
              <h3 className="font-semibold text-lg">Investimentos Gerais</h3>
            </div>
            <p className="text-3xl font-bold">
              {formatCurrency(generalInvestments.reduce((acc, i) => acc + i.currentAmount, 0))}
            </p>
            <p className="text-sm opacity-75 mt-2">Foco no longo prazo</p>
         </Card>
      </div>

      {/* Add Form */}
      <Card>
        <h3 className="font-bold text-slate-800 mb-4">Novo Investimento / Aplicação</h3>
        <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <Input label="Nome" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ex: Tesouro Selic, CDB..." />
          </div>
          <div className="w-full md:w-32">
             <div className="flex flex-col gap-1">
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

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {investments.map(inv => (
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
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(inv.currentAmount)}</p>
            <div className="mt-4 flex gap-2">
               <Button variant="secondary" className="text-xs py-1 px-2 w-full" onClick={() => alert('Para simplificar, para editar o saldo delete e recrie por enquanto.')}>+ Aportar</Button>
            </div>
          </Card>
        ))}
        {investments.length === 0 && (
          <div className="col-span-full p-8 text-center text-slate-400">
             {isLoading ? 'Carregando investimentos...' : 'Nenhum investimento cadastrado.'}
          </div>
        )}
      </div>
    </div>
  );
};

// 3. Advisor Page Component
const AdvisorPage = ({ transactions, investments }: { transactions: Transaction[], investments: Investment[] }) => {
  const [advice, setAdvice] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleConsult = async () => {
    setLoading(true);
    const result = await getFinancialAdvice(transactions, investments);
    setAdvice(result);
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 bg-purple-100 rounded-full text-purple-600 mb-2">
          <IconBrain className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Consultor Financeiro AI</h2>
        <p className="text-slate-500">Utilize a inteligência artificial para analisar seus gastos e receber dicas personalizadas para Thiago e Marcela.</p>
      </div>

      <div className="flex justify-center">
        <Button onClick={handleConsult} disabled={loading} className="w-full md:w-auto px-8 bg-purple-600 hover:bg-purple-700">
          {loading ? 'Analisando...' : 'Gerar Análise Financeira'}
        </Button>
      </div>
      
      {!localStorage.getItem('gemini_api_key') && (
        <div className="text-center text-sm text-amber-600 bg-amber-50 p-2 rounded-lg">
           ⚠️ Você precisa configurar sua chave de API na aba "Configurações" antes de usar.
        </div>
      )}

      {advice && (
        <Card className="prose prose-slate max-w-none bg-purple-50 border-purple-100">
           <div dangerouslySetInnerHTML={{ __html: advice.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
        </Card>
      )}
    </div>
  );
};

// 4. Settings Page (Updated for Cloud Info & API Key)
const SettingsPage = () => {
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [saved, setSaved] = useState(false);

  const handleSaveKey = () => {
    localStorage.setItem('gemini_api_key', apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleLogout = () => {
     localStorage.removeItem('app_authenticated');
     window.location.reload();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <IconSettings className="w-5 h-5" /> Configuração de IA (Gemini)
        </h3>
        <p className="text-sm text-slate-600 mb-4">
          Para usar o Consultor Financeiro, você precisa de uma chave de API gratuita do Google.
          <br />
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
            Clique aqui para gerar sua chave
          </a>.
        </p>
        <div className="flex gap-2">
          <div className="flex-1">
             <Input 
                label="Chave da API (Começa com AIza...)" 
                type="password"
                value={apiKey} 
                onChange={e => setApiKey(e.target.value)} 
                placeholder="Cole sua chave aqui" 
             />
          </div>
          <div className="flex items-end">
            <Button onClick={handleSaveKey} variant="primary">
               {saved ? 'Salvo!' : 'Salvar Chave'}
            </Button>
          </div>
        </div>
      </Card>

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
        <h3 className="text-lg font-bold text-slate-800 mb-2">Conta</h3>
        <Button onClick={handleLogout} variant="danger" className="w-full">
           Sair do Aplicativo
        </Button>
      </Card>
    </div>
  );
};

// 5. Login Page
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
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

  // Load Data from Supabase
  const fetchData = async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);
    try {
      const { data: transData, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (transError) throw transError;

      const { data: invData, error: invError } = await supabase
        .from('investments')
        .select('*');

      if (invError) throw invError;

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

    } catch (err: any) {
      console.error("Erro ao carregar dados:", err);
      if (err.message?.includes('Invalid URL')) {
        setError('Configuração do Supabase pendente. Edite o arquivo services/supabase.ts');
      } else {
        setError('Erro ao conectar ao banco de dados.');
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
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          description: t.description,
          amount: t.amount,
          type: t.type,
          category: t.category,
          user: t.user,
          date: t.date
        }])
        .select();

      if (error) throw error;
      if (data) {
        setTransactions(prev => [...prev, data[0] as Transaction]);
        fetchData();
      }
    } catch (err) {
      alert("Erro ao salvar transação. Verifique console.");
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

  const addInvestment = async (inv: Omit<Investment, 'id' | 'history'>, initialAmount: number) => {
    setIsLoading(true);
    try {
      const historyItem = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        amount: initialAmount,
        type: 'aporte'
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
    const income = transactions.filter(t => t.type === 'receita').reduce((acc, t) => acc + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'despesa').reduce((acc, t) => acc + t.amount, 0);
    const invested = investments.reduce((acc, i) => acc + i.currentAmount, 0);
    return { income, expenses, balance: income - expenses, invested };
  }, [transactions, investments]);

  // Render Helpers
  const renderContent = () => {
    if (error) {
      return (
        <Card className="bg-red-50 border-red-200">
           <h3 className="text-red-700 font-bold mb-2">Configuração Necessária</h3>
           <p className="text-red-600">{error}</p>
        </Card>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-l-4 border-l-emerald-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Saldo Atual</p>
                    <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(stats.balance)}</h3>
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
                    <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(stats.income)}</h3>
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
                    <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(stats.expenses)}</h3>
                  </div>
                  <div className="p-2 bg-rose-100 rounded-full text-rose-600">
                     <IconTrendingDown />
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Fluxo Mensal</h3>
                <MonthlyChart transactions={transactions} />
              </Card>
              <Card>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Gastos por Categoria</h3>
                <CategoryChart transactions={transactions} />
              </Card>
            </div>
            
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white flex justify-between items-center shadow-lg">
               <div>
                  <h3 className="text-xl font-bold">Total Investido</h3>
                  <p className="opacity-80">Inclui Reserva de Emergência e Investimentos</p>
               </div>
               <div className="text-3xl font-bold text-emerald-400">
                 {formatCurrency(stats.invested)}
               </div>
            </div>
          </div>
        );
      case 'transactions':
        return <TransactionsPage transactions={transactions} onAdd={addTransaction} onDelete={deleteTransaction} isLoading={isLoading} />;
      case 'investments':
        return <InvestmentsPage investments={investments} onAdd={addInvestment} onDelete={deleteInvestment} isLoading={isLoading} />;
      case 'advisor':
        return <AdvisorPage transactions={transactions} investments={investments} />;
      case 'settings':
        return <SettingsPage />;
      default:
        return null;
    }
  };

  if (checkingAuth) return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Carregando...</div>;

  if (!isAuthenticated) {
     return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex-shrink-0 sticky top-0 md:h-screen z-10 overflow-y-auto">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            DuoFin
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wide">Thiago & Marcela</p>
        </div>
        <nav className="p-4 space-y-2">
          <NavButton 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
            icon={<IconPieChart />} 
            label="Visão Geral" 
          />
          <NavButton 
            active={activeTab === 'transactions'} 
            onClick={() => setActiveTab('transactions')} 
            icon={<IconList />} 
            label="Transações" 
          />
          <NavButton 
            active={activeTab === 'investments'} 
            onClick={() => setActiveTab('investments')} 
            icon={<IconTrendingUp />} 
            label="Investimentos" 
          />
          <NavButton 
            active={activeTab === 'advisor'} 
            onClick={() => setActiveTab('advisor')} 
            icon={<IconBrain />} 
            label="Consultor AI" 
            special
          />
          <div className="pt-4 mt-4 border-t border-slate-100">
            <NavButton 
              active={activeTab === 'settings'} 
              onClick={() => setActiveTab('settings')} 
              icon={<IconSettings />} 
              label="Configurações" 
            />
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 capitalize">
              {activeTab === 'advisor' ? 'Consultor AI' : activeTab === 'dashboard' ? 'Painel de Controle' : activeTab === 'settings' ? 'Configurações' : activeTab}
            </h2>
            <p className="text-slate-500 text-sm">Controle financeiro na Nuvem.</p>
          </div>
          <div className="hidden md:flex gap-2">
             <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">Thiago</div>
             <div className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-xs font-bold">Marcela</div>
          </div>
        </header>
        {renderContent()}
      </main>
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
  icon: React.ReactElement<{ className?: string }>; 
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
    {React.cloneElement(icon, { className: "w-5 h-5" })}
    {label}
  </button>
);

export default App;