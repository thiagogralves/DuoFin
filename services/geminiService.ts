
import { GoogleGenAI } from "@google/genai";
import { Transaction, Investment } from '../types';

// Função auxiliar para filtrar por data
const filterByDateRange = (transactions: Transaction[], days: number) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return transactions.filter(t => new Date(t.date) >= cutoff);
};

// Função para calcular totais
const calculateTotals = (transactions: Transaction[]) => {
  const income = transactions.filter(t => t.type === 'receita').reduce((acc, t) => acc + t.amount, 0);
  const expenses = transactions.filter(t => t.type === 'despesa').reduce((acc, t) => acc + t.amount, 0);
  return { income, expenses, balance: income - expenses };
};

export const getProductInfoFromUrl = async (url: string, availableCategories: string[]): Promise<{ description?: string, amount?: number, category?: string }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
      Você é um assistente de extração de dados.
      Analise a seguinte URL de produto e extraia as informações mais prováveis: ${url}
      
      Tarefas:
      1. Extraia o NOME DO PRODUTO (descrição) baseado no slug ou texto da URL.
      2. Estime um PREÇO (amount) em BRL (Reais) que seja comum para este produto no mercado atual. Se não conseguir estimar, retorne 0.
      3. Escolha a CATEGORIA mais adequada da lista abaixo:
      ${availableCategories.join(', ')}

      Retorne APENAS um JSON neste formato:
      {
        "description": "Nome do Produto",
        "amount": 100.00,
        "category": "Categoria Escolhida"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (text) {
       return JSON.parse(text);
    }
    return {};
  } catch (error) {
    console.error("Erro ao analisar URL do produto:", error);
    return {};
  }
};

export const getFinancialAdvice = async (
  transactions: Transaction[],
  investments: Investment[]
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // 1. Pré-processamento de Dados (Aggregation)
    const isFixedOrInstallment = (t: Transaction) => t.is_recurring;

    // Curto Prazo (Últimos 30 dias)
    const last30Days = filterByDateRange(transactions, 30);
    const variableExpenses30d = last30Days.filter(t => t.type === 'despesa' && !isFixedOrInstallment(t));
    const fixedExpenses30d = last30Days.filter(t => t.type === 'despesa' && isFixedOrInstallment(t));
    
    const totalVariable30d = variableExpenses30d.reduce((acc, t) => acc + t.amount, 0);
    const totalFixed30d = fixedExpenses30d.reduce((acc, t) => acc + t.amount, 0);
    const stats30d = calculateTotals(last30Days);

    // Médio Prazo (Últimos 6 meses)
    const last6Months = filterByDateRange(transactions, 180);
    const stats6m = calculateTotals(last6Months);

    // Longo Prazo
    const lastYear = filterByDateRange(transactions, 365);
    const stats1y = calculateTotals(lastYear);

    // Análise por Usuário
    const statsThiago = calculateTotals(last30Days.filter(t => t.user === 'Thiago'));
    const statsMarcela = calculateTotals(last30Days.filter(t => t.user === 'Marcela'));

    // Investimentos
    const totalInvested = investments.reduce((acc, i) => acc + i.currentAmount, 0);
    const emergencyFund = investments.filter(i => i.type === 'emergencia').reduce((acc, i) => acc + i.currentAmount, 0);

    const categories: Record<string, number> = {};
    variableExpenses30d.forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });
    const topCategories = Object.entries(categories)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([k, v]) => `${k}: R$ ${v.toFixed(2)}`)
      .join(', ');

    const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const prompt = `
      Atue como um Consultor Financeiro Pessoal Sênior (IA) para Thiago e Marcela.
      Gere um relatório semanal detalhado. Use Markdown e emojis. Seja direto, analítico e motivador.

      ### DADOS FINANCEIROS COMPUTADOS
      - Gasto Variável (30d): ${formatBRL(totalVariable30d)}
      - Maiores gastos: ${topCategories}
      - Total Fixo/Parcelas: ${formatBRL(totalFixed30d)}
      - Receita (30d): ${formatBRL(stats30d.income)}
      - Saldo (30d): ${formatBRL(stats30d.balance)}
      - Média Despesas (6m): ${formatBRL(stats6m.expenses / 6)}
      - Patrimônio: ${formatBRL(totalInvested)} (Reserva: ${formatBRL(emergencyFund)})
      - Thiago (30d): ${formatBRL(statsThiago.expenses)}
      - Marcela (30d): ${formatBRL(statsMarcela.expenses)}

      ### INSTRUÇÕES DE SAÍDA
      Use exatamente estas seções com Markdown:
      ## 📅 Curto Prazo (Foco no Variável)
      ## 📈 Médio Prazo (O Peso das Parcelas)
      ## 🔭 Longo Prazo (1 a 5 Anos)
      ## 👥 Análise Individual & Casal
      ## 💡 Veredito da Semana
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Não foi possível gerar a análise detalhada no momento.";
  } catch (error) {
    console.error("Erro ao consultar Gemini:", error);
    return "Desculpe, ocorreu um erro técnico ao gerar sua consultoria. Tente novamente mais tarde.";
  }
};
