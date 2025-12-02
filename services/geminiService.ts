import { GoogleGenAI } from "@google/genai";
import { Transaction, Investment } from '../types';

export const getFinancialAdvice = async (
  transactions: Transaction[],
  investments: Investment[]
): Promise<string> => {
  try {
    // 1. Tenta pegar do ambiente (Vercel)
    let apiKey = process.env.API_KEY;

    // 2. Se não tiver, tenta pegar do navegador (configurado pelo usuário)
    if (!apiKey) {
      apiKey = localStorage.getItem('gemini_api_key') || undefined;
    }
    
    if (!apiKey) {
      return "⚠️ <strong>Chave de API não configurada.</strong><br/>Por favor, vá em <strong>Configurações</strong> e cole sua chave do Google Gemini.";
    }

    const ai = new GoogleGenAI({ apiKey });
    
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
    return "Desculpe, ocorreu um erro ao tentar analisar suas finanças. Verifique se sua chave de API está correta em Configurações.";
  }
};
