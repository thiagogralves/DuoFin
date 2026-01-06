import { GoogleGenAI, Type } from "@google/genai";
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
    if (!process.env.API_KEY || process.env.API_KEY === "undefined") {
      throw new Error("Chave de API não configurada no ambiente.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `Analise a seguinte URL de produto e extraia o nome, preço estimado em BRL e a melhor categoria: ${url}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING, description: "Nome do produto" },
            amount: { type: Type.NUMBER, description: "Preço estimado em Reais" },
            category: { type: Type.STRING, enum: availableCategories, description: "Categoria mais próxima" }
          },
          required: ["description", "amount", "category"]
        }
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
    // Verificação robusta da chave de API injetada pelo Vercel/Vite
    const apiKey = process.env.API_KEY;
    if (!apiKey || apiKey === "undefined" || apiKey === "") {
      console.error("API_KEY is missing from environment variables.");
      return "⚠️ Erro de Configuração: A variável de ambiente API_KEY não foi encontrada. Certifique-se de que ela está configurada no Vercel com o nome EXATO de 'API_KEY' e que você realizou um novo Deploy após a mudança.";
    }

    const ai = new GoogleGenAI({ apiKey });

    // 1. Pré-processamento de Dados
    const last30Days = filterByDateRange(transactions, 30);
    const variableExpenses30d = last30Days.filter(t => t.type === 'despesa' && !t.is_recurring);
    const totalVariable30d = variableExpenses30d.reduce((acc, t) => acc + t.amount, 0);
    const fixedExpenses30d = last30Days.filter(t => t.type === 'despesa' && t.is_recurring);
    const totalFixed30d = fixedExpenses30d.reduce((acc, t) => acc + t.amount, 0);
    
    const stats30d = calculateTotals(last30Days);
    const last6Months = filterByDateRange(transactions, 180);
    const stats6m = calculateTotals(last6Months);

    const statsThiago = calculateTotals(last30Days.filter(t => t.user === 'Thiago'));
    const statsMarcela = calculateTotals(last30Days.filter(t => t.user === 'Marcela'));

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
      Analise os dados financeiros reais fornecidos abaixo e gere um relatório semanal estratégico. 
      Use Markdown e emojis. Seja direto, crítico quando necessário e motivador.

      ### DADOS FINANCEIROS DOS ÚLTIMOS 30 DIAS
      - Gasto Variável: ${formatBRL(totalVariable30d)}
      - Maiores Categorias: ${topCategories}
      - Gastos Fixos/Parcelados: ${formatBRL(totalFixed30d)}
      - Receita Total: ${formatBRL(stats30d.income)}
      - Saldo Líquido do Mês: ${formatBRL(stats30d.balance)}
      - Patrimônio Total: ${formatBRL(totalInvested)} (Reserva: ${formatBRL(emergencyFund)})
      - Divisão de Gastos: Thiago ${formatBRL(statsThiago.expenses)} | Marcela ${formatBRL(statsMarcela.expenses)}
      - Média Histórica de Despesas (6 meses): ${formatBRL(stats6m.expenses / 6)}

      ### ESTRUTURA DO RELATÓRIO
      Use EXATAMENTE estes títulos (##) e ícones:
      ## 📅 Curto Prazo (Foco no Variável)
      ## 📈 Médio Prazo (O Peso das Parcelas)
      ## 🔭 Longo Prazo (Construção de Patrimônio)
      ## 👥 Análise Individual & Casal
      ## 💡 Veredito e Ações Práticas para esta Semana
    `;

    // Alterado para gemini-3-flash-preview para maior estabilidade e rapidez
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    if (!response.text) {
      throw new Error("O modelo retornou uma resposta vazia.");
    }

    return response.text;
  } catch (error: any) {
    console.error("Erro crítico no Gemini Service:", error);
    
    if (error.message?.includes("API key not valid")) {
      return "❌ Erro: A chave de API do Gemini não é válida. Verifique se a API_KEY nas configurações do Vercel está correta.";
    }
    
    return `❌ Erro Técnico: Não foi possível gerar a consultoria. Detalhes: ${error.message || 'Erro desconhecido'}`;
  }
};
