export type User = 'Thiago' | 'Marcela' | 'Ambos';

export type TransactionType = 'receita' | 'despesa';

export type InvestmentType = 'geral' | 'emergencia';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  user: User;
  date: string; // ISO Date string YYYY-MM-DD
  is_recurring?: boolean;
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

export interface DashboardStats {
  totalBalance: number;
  income: number;
  expenses: number;
  investments: number;
  emergency: number;
}