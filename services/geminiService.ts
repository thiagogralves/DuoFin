import { GoogleGenAI } from "@google/genai";
import { Transaction, Investment } from '../types';

// Use API Key from environment (configured in vite.config.ts)
const API_KEY = process.env.API_KEY;

export const getFinancialAdvice = async (
  transactions: Transaction[],
  investments: Investment[]
): Promise<string> => {
  try {
    if (!API_KEY) {
      return "⚠️ <strong>Erro de Configuração</strong><br/>A chave de API não foi encontrada no código.";
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    // Prepare data summary for the AI
    const income = transactions.filter(t => t.type === 'receita').reduce((acc, t) => acc + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'despesa').reduce((acc, t) => acc + t.amount, 0);
    const totalInvested = investments.reduce((acc, i) => acc + i.currentAmount, 0);
    
    // Group expenses by category
    const categoryExpenses: Record<string, number> = {};
    transactions.filter(t => t.type === 'despesa').forEach(t => {
      categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + t.amount;
    });

    const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const prompt = `
      Atue como um consultor financeiro pessoal experiente para um casal chamado Thiago e Marcela.
      Analise os seguintes dados financeiros resumidos:

      - Total Receitas: ${formatBRL(income)}
      - Total Despesas: ${formatBRL(expenses)}
      - Saldo Atual (Fluxo de Caixa): ${formatBRL(income - expenses)}
      - Total Investido (Geral + Reserva): ${formatBRL(totalInvested)}
      
      Despesas por categoria:
      ${JSON.stringify(categoryExpenses, null, 2)}

      Forneça 3 conselhos práticos e diretos em formato Markdown.
      1. Uma análise sobre o fluxo de caixa atual.
      2. Uma observação sobre onde eles estão gastando mais e se é saudável.
      3. Uma recomendação sobre os investimentos ou reserva de emergência.

      Seja motivador mas realista. Use emojis.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Não foi possível gerar conselhos no momento.";
  } catch (error) {
    console.error("Erro ao consultar Gemini:", error);
    return "Desculpe, ocorreu um erro ao tentar analisar suas finanças. Verifique se a Chave API está ativa e válida.";
  }
};
