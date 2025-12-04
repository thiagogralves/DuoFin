
export type User = 'Thiago' | 'Marcela' | 'Ambos';

export type TransactionType = 'receita' | 'despesa';

export type PaymentMethod = 'dinheiro' | 'pix' | 'cartao' | 'boleto';

export type InvestmentType = 'geral' | 'emergencia';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  is_system?: boolean; // True se for categoria padrão (não pode excluir)
  is_essential?: boolean; // True se for gasto essencial (para gráficos)
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  user: User;
  date: string; // ISO Date string YYYY-MM-DD
  is_recurring?: boolean;
  recurring_months?: number;
  payment_method?: PaymentMethod;
  is_paid?: boolean;
}

export interface InvestmentOperation {
  id: string;
  date: string;
  amount: number;
  type: 'aporte' | 'resgate';
}

export interface Investment {
  id: string;
  name: string;
  type: InvestmentType;
  currentAmount: number;
  goal?: number;
  user: User; // Who primarily manages it, or 'Ambos'
  history: InvestmentOperation[];
}

export interface Budget {
  id: string;
  category: string;
  limit_amount: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  user: User;
}

export interface DashboardStats {
  totalBalance: number;
  income: number;
  expenses: number;
  investments: number;
  emergency: number;
}
