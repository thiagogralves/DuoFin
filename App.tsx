import React, { useState, useEffect } from 'react';
import { 
  IconPieChart, IconList, IconWallet, IconBrain, IconSettings,
  IconSun, IconMoon, IconEye, IconEyeOff, IconPlus, IconRefresh, IconTrendingUp, IconTrendingDown
} from './components/Icons';
import { Card, Button, Select, formatCurrency, Modal, Input } from './components/UI';
import { MonthlyChart, CategoryChart, EvolutionChart, SemestralChart, LifestyleChart, UserDistChart, TopOffendersChart } from './components/Charts';
import { getFinancialAdvice } from './services/geminiService';
import { supabase } from './services/supabase';
import { Transaction, Investment, Category, User } from './types';
import { USERS, CATEGORIES } from './constants';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState<User>('Ambos');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [advice, setAdvice] = useState<string>('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  
  // Modal states
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  
  // Fetch data
  const fetchData = async () => {
    setLoadingData(true);
    try {
      const { data: txData } = await supabase.from('transactions').select('*').order('date', { ascending: false });
      if (txData) setTransactions(txData);

      const { data: invData } = await supabase.from('investments').select('*');
      if (invData) setInvestments(invData);

      const { data: catData } = await supabase.from('categories').select('*');
      if (catData) setCategories(catData);

    } catch (error) {
      console.error('Error fetching data', error);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Theme init
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Derived state
  const filteredTransactions = transactions.filter(t => 
    currentUser === 'Ambos' || t.user === currentUser
  );
  
  const filteredInvestments = investments.filter(i => 
    currentUser === 'Ambos' || i.user === currentUser || i.user === 'Ambos'
  );

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'receita')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = filteredTransactions
    .filter(t => t.type === 'despesa')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalBalance = totalIncome - totalExpense;
  const totalInvested = filteredInvestments.reduce((acc, i) => acc + i.currentAmount, 0);

  const handleGetAdvice = async () => {
    setLoadingAdvice(true);
    const advice = await getFinancialAdvice(filteredTransactions, filteredInvestments);
    setAdvice(advice);
    setLoadingAdvice(false);
  };

  const NavItem = ({ id, icon: Icon, label }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-3 p-3 rounded-xl transition-all w-full ${
        activeTab === id 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200 flex font-sans`}>
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-6 hidden md:flex flex-col z-10">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">F</span>
          </div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Finanças</h1>
        </div>

        <nav className="space-y-2 flex-1">
          <NavItem id="dashboard" icon={IconPieChart} label="Painel" />
          <NavItem id="transactions" icon={IconList} label="Transações" />
          <NavItem id="investments" icon={IconWallet} label="Investimentos" />
          <NavItem id="advisor" icon={IconBrain} label="Consultor AI" />
        </nav>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-2">
          <NavItem id="settings" icon={IconSettings} label="Configurações" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto">
        {/* Header from snippet */}
        <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white capitalize">
              {activeTab === 'advisor' ? 'Consultor AI' : 
               activeTab === 'dashboard' ? 'Painel de Controle' : 
               activeTab === 'transactions' ? 'Transações' : 
               activeTab === 'investments' ? 'Investimentos' : 
               activeTab === 'settings' ? 'Configurações' : activeTab}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
               Visualizando dados de: <strong className="text-slate-700 dark:text-slate-300">{currentUser === 'Ambos' ? 'Geral (Thiago + Marcela)' : currentUser}</strong>
            </p>
          </div>
          
          <div className="flex items-center gap-2">
             <div className="flex bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1">
                {USERS.map(u => (
                  <button
                    key={u}
                    onClick={() => setCurrentUser(u as User)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      currentUser === u 
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {u}
                  </button>
                ))}
             </div>
             
             <button 
               onClick={() => setPrivacyMode(!privacyMode)}
               className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
               title={privacyMode ? "Mostrar valores" : "Ocultar valores"}
             >
               {privacyMode ? <IconEyeOff className="w-5 h-5"/> : <IconEye className="w-5 h-5"/>}
             </button>

             <button 
               onClick={() => setDarkMode(!darkMode)}
               className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
             >
               {darkMode ? <IconSun className="w-5 h-5"/> : <IconMoon className="w-5 h-5"/>}
             </button>
          </div>
        </header>

        {/* Dashboard Content */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-blue-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-500 text-xs uppercase font-bold">Saldo Atual</p>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                      {formatCurrency(totalBalance, privacyMode)}
                    </h3>
                  </div>
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                    <IconWallet className="w-6 h-6" />
                  </div>
                </div>
              </Card>

              <Card className="border-l-4 border-l-emerald-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-500 text-xs uppercase font-bold">Receitas (Mês)</p>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                      {formatCurrency(totalIncome, privacyMode)}
                    </h3>
                  </div>
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600">
                    <IconTrendingUp className="w-6 h-6" />
                  </div>
                </div>
              </Card>

              <Card className="border-l-4 border-l-red-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-500 text-xs uppercase font-bold">Despesas (Mês)</p>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                      {formatCurrency(totalExpense, privacyMode)}
                    </h3>
                  </div>
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600">
                    <IconTrendingDown className="w-6 h-6" />
                  </div>
                </div>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-500 text-xs uppercase font-bold">Investido</p>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                      {formatCurrency(totalInvested, privacyMode)}
                    </h3>
                  </div>
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
                    <IconBrain className="w-6 h-6" />
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                 <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4">Fluxo de Caixa (6 meses)</h3>
                 <SemestralChart transactions={filteredTransactions} hidden={privacyMode} />
              </Card>
              <Card>
                 <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4">Despesas por Categoria</h3>
                 <CategoryChart transactions={filteredTransactions} hidden={privacyMode} />
              </Card>
            </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <Card>
                  <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4">Estilo de Vida</h3>
                  <LifestyleChart transactions={filteredTransactions} categories={categories} hidden={privacyMode} />
               </Card>
               <Card>
                  <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4">Distribuição por Pessoa</h3>
                  <UserDistChart transactions={filteredTransactions} hidden={privacyMode} />
               </Card>
               <Card>
                  <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4">Top Despesas</h3>
                  <TopOffendersChart transactions={filteredTransactions} hidden={privacyMode} />
               </Card>
             </div>
          </div>
        )}

        {/* Transactions Content */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
               <div className="flex gap-2">
                 <Input 
                   label="" 
                   value="" 
                   onChange={() => {}} 
                   placeholder="Buscar transação..." 
                 />
               </div>
               <Button onClick={() => setIsTxModalOpen(true)}>
                 <IconPlus className="w-4 h-4" /> Nova Transação
               </Button>
            </div>
            
            <Card className="overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-700 text-xs uppercase font-bold text-slate-500 dark:text-slate-400">
                       <tr>
                          <th className="px-6 py-3">Data</th>
                          <th className="px-6 py-3">Descrição</th>
                          <th className="px-6 py-3">Categoria</th>
                          <th className="px-6 py-3">Responsável</th>
                          <th className="px-6 py-3 text-right">Valor</th>
                          <th className="px-6 py-3 text-center">Ações</th>
                       </tr>
                    </thead>
                    <tbody>
                       {filteredTransactions.length === 0 ? (
                         <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Nenhuma transação encontrada.</td></tr>
                       ) : (
                         filteredTransactions.map(t => (
                           <tr key={t.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="px-6 py-4">{new Date(t.date).toLocaleDateString()}</td>
                              <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">{t.description}</td>
                              <td className="px-6 py-4">
                                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs">
                                  {t.category}
                                </span>
                              </td>
                              <td className="px-6 py-4">{t.user}</td>
                              <td className={`px-6 py-4 text-right font-bold ${t.type === 'receita' ? 'text-emerald-600' : 'text-red-500'}`}>
                                 {t.type === 'despesa' ? '-' : '+'} {formatCurrency(t.amount, privacyMode)}
                              </td>
                              <td className="px-6 py-4 text-center">
                                 <button className="text-slate-400 hover:text-red-500">
                                   <IconRefresh className="w-4 h-4" />
                                 </button>
                              </td>
                           </tr>
                         ))
                       )}
                    </tbody>
                 </table>
               </div>
            </Card>
          </div>
        )}

        {/* Investments Content */}
        {activeTab === 'investments' && (
          <div className="space-y-6">
            <Card>
               <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">Carteira de Investimentos</h3>
               <div className="space-y-4">
                  {filteredInvestments.length === 0 ? (
                    <p className="text-slate-500">Nenhum investimento cadastrado.</p>
                  ) : (
                    filteredInvestments.map(inv => (
                      <div key={inv.id} className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-700 rounded-lg">
                         <div>
                            <h4 className="font-bold text-slate-800 dark:text-white">{inv.name}</h4>
                            <p className="text-xs text-slate-500 uppercase">{inv.type}</p>
                         </div>
                         <div className="text-right">
                            <p className="font-bold text-blue-600 dark:text-blue-400 text-lg">
                              {formatCurrency(inv.currentAmount, privacyMode)}
                            </p>
                            {inv.goal && (
                               <p className="text-xs text-slate-400">Meta: {formatCurrency(inv.goal, privacyMode)}</p>
                            )}
                         </div>
                      </div>
                    ))
                  )}
               </div>
            </Card>
          </div>
        )}

        {/* Advisor Content */}
        {activeTab === 'advisor' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <Card className="text-center p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-lg">
                 <IconBrain className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Gemini Financial Advisor</h2>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                Utilize inteligência artificial para analisar suas finanças e receber conselhos personalizados sobre seus gastos e investimentos.
              </p>
              
              <Button onClick={handleGetAdvice} disabled={loadingAdvice || loadingData} className="w-full md:w-auto mx-auto px-8">
                 {loadingAdvice ? 'Analisando dados...' : 'Gerar Análise Financeira'}
              </Button>
            </Card>

            {advice && (
               <Card className="animate-in slide-in-from-bottom-4 duration-500">
                  <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white flex items-center gap-2">
                     <IconBrain className="text-purple-500" /> Análise do Gemini
                  </h3>
                  <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                     <div dangerouslySetInnerHTML={{ __html: advice.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                  </div>
               </Card>
            )}
          </div>
        )}

        {/* Settings Content */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <Card>
              <h3 className="font-bold text-lg mb-4">Preferências</h3>
              <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-700">
                 <span>Modo Escuro</span>
                 <button 
                   onClick={() => setDarkMode(!darkMode)}
                   className={`w-12 h-6 rounded-full transition-colors relative ${darkMode ? 'bg-blue-600' : 'bg-slate-300'}`}
                 >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${darkMode ? 'left-7' : 'left-1'}`} />
                 </button>
              </div>
              <div className="flex items-center justify-between py-4">
                 <span>Modo de Privacidade (Ocultar Valores)</span>
                 <button 
                   onClick={() => setPrivacyMode(!privacyMode)}
                   className={`w-12 h-6 rounded-full transition-colors relative ${privacyMode ? 'bg-blue-600' : 'bg-slate-300'}`}
                 >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${privacyMode ? 'left-7' : 'left-1'}`} />
                 </button>
              </div>
            </Card>
          </div>
        )}

      </main>
      
      {/* Mobile Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-2 flex justify-around md:hidden z-20">
         <button onClick={() => setActiveTab('dashboard')} className={`p-2 rounded-lg ${activeTab === 'dashboard' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-400'}`}>
            <IconPieChart />
         </button>
         <button onClick={() => setActiveTab('transactions')} className={`p-2 rounded-lg ${activeTab === 'transactions' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-400'}`}>
            <IconList />
         </button>
         <button onClick={() => setActiveTab('investments')} className={`p-2 rounded-lg ${activeTab === 'investments' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-400'}`}>
            <IconWallet />
         </button>
         <button onClick={() => setActiveTab('advisor')} className={`p-2 rounded-lg ${activeTab === 'advisor' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-400'}`}>
            <IconBrain />
         </button>
      </nav>
    </div>
  );
}
