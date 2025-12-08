import { GoogleGenAI } from "@google/genai";
import { Transaction, Investment } from '../types';

// Use API Key from environment (configured in vite.config.ts)
const API_KEY = process.env.API_KEY;

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
    if (!API_KEY) return {};

    const ai = new GoogleGenAI({ apiKey: API_KEY });

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
      model: 'gemini-2.5-flash',
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
    if (!API_KEY) {
      return "⚠️ <strong>Erro de Configuração</strong><br/>A chave de API não foi encontrada no código.";
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });

    // 1. Pré-processamento de Dados (Aggregation)
    
    // Separação de Recorrentes vs Variáveis (Para análise de curto prazo)
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

    // Longo Prazo (1 ano e 3 anos - simulação baseada no histórico total se for menor)
    const lastYear = filterByDateRange(transactions, 365);
    const stats1y = calculateTotals(lastYear);

    // Análise por Usuário (Thiago vs Marcela - Mês Atual)
    const thiagoTrans = last30Days.filter(t => t.user === 'Thiago');
    const marcelaTrans = last30Days.filter(t => t.user === 'Marcela');
    const statsThiago = calculateTotals(thiagoTrans);
    const statsMarcela = calculateTotals(marcelaTrans);

    // Investimentos
    const totalInvested = investments.reduce((acc, i) => acc + i.currentAmount, 0);
    const emergencyFund = investments.filter(i => i.type === 'emergencia').reduce((acc, i) => acc + i.currentAmount, 0);

    // Top Categorias VARIÁVEIS (Mês Atual) - Onde dá pra economizar agora
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

    // Construção do Prompt Estruturado
    const prompt = `
      Atue como um Consultor Financeiro Pessoal Sênior (IA) para Thiago e Marcela.
      Gere um relatório semanal detalhado. Use Markdown e emojis. Seja direto, analítico e motivador.

      ### 1. DADOS FINANCEIROS COMPUTADOS

      **Curto Prazo (Snapshot Atual - Foco em Hábitos):**
      - Total Gasto Variável (Mercado, Lazer, etc - "Mudável agora"): ${formatBRL(totalVariable30d)}
      - Maiores gastos variáveis (30d): ${topCategories}
      - Total Comprometido com Fixos/Parcelas: ${formatBRL(totalFixed30d)}
      - Receita Total (30d): ${formatBRL(stats30d.income)}
      - Saldo Geral (30d): ${formatBRL(stats30d.balance)}

      **Médio/Longo Prazo (Estrutural):**
      - Média Mensal de Despesas (6 meses): ${formatBRL(stats6m.expenses / 6)}
      - Total Acumulado (1 ano): Receita ${formatBRL(stats1y.income)} | Despesa ${formatBRL(stats1y.expenses)}
      - Patrimônio Líquido (Investimentos): ${formatBRL(totalInvested)} (Reserva Emergência: ${formatBRL(emergencyFund)})

      **Divisão:**
      - Thiago (30d): ${formatBRL(statsThiago.expenses)}
      - Marcela (30d): ${formatBRL(statsMarcela.expenses)}

      ### 2. INSTRUÇÕES DE SAÍDA (FORMATO OBRIGATÓRIO)

      Gere o relatório com exatamente estas seções. Use texto escuro e legível.

      ## 📅 Curto Prazo (Foco no Variável)
      **Ignore as despesas parceladas/fixas nesta seção.**
      Analise apenas o consumo imediato (${formatBRL(totalVariable30d)}).
      Eles gastaram muito com supérfluos? Onde podem cortar *hoje*?
      Cite as categorias variáveis mais altas.

      ## 📈 Médio Prazo (O Peso das Parcelas)
      Agora sim, analise o impacto das parcelas e fixos (${formatBRL(totalFixed30d)}).
      Isso está consumindo muito da renda? Eles estão criando uma "bola de neve" de parcelamentos?
      Compare a média de 6 meses com a atualidade.

      ## 🔭 Longo Prazo (1 a 5 Anos)
      Com base no patrimônio investido (${formatBRL(totalInvested)}).
      - Projeção para 3 anos se mantiverem o ritmo.
      - A reserva de emergência está saudável?

      ## 👥 Análise Individual & Casal
      - Comentários breves sobre Thiago vs Marcela.
      - Nível de sinergia do casal.

      ## 💡 Veredito da Semana
      Uma frase de impacto.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Não foi possível gerar a análise detalhada no momento.";
  } catch (error) {
    console.error("Erro ao consultar Gemini:", error);
    return "Desculpe, ocorreu um erro técnico ao gerar sua consultoria. Tente novamente mais tarde.";
  }
};
