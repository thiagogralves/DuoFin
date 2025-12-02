export const USERS = ['Thiago', 'Marcela', 'Ambos'];

export const CATEGORIES = {
  INCOME: [
    'Salário',
    'Freelance',
    'Investimentos (Dividendos)',
    'Venda de Itens',
    'Presente',
    'Outros'
  ],
  EXPENSE: [
    'Aluguel/Condomínio',
    'Mercado',
    'Energia Elétrica',
    'Água/Esgoto',
    'Internet/TV',
    'Celular',
    'Transporte/Combustível',
    'Carro (Manutenção/IPVA)',
    'Saúde/Farmácia',
    'Lazer/Restaurantes',
    'Educação',
    'Assinaturas (Streaming)',
    'Roupas/Acessórios',
    'Casa/Decoração',
    'Pets',
    'Viagem',
    'Presentes',
    'Impostos',
    'Outros'
  ]
};

export const MOCK_TRANSACTIONS = [
  { id: '1', description: 'Salário Thiago', amount: 5000, type: 'receita', category: 'Salário', user: 'Thiago', date: '2023-10-05' },
  { id: '2', description: 'Salário Marcela', amount: 5500, type: 'receita', category: 'Salário', user: 'Marcela', date: '2023-10-05' },
  { id: '3', description: 'Aluguel', amount: 2500, type: 'despesa', category: 'Aluguel/Condomínio', user: 'Ambos', date: '2023-10-10' },
  { id: '4', description: 'Mercado Semanal', amount: 450, type: 'despesa', category: 'Mercado', user: 'Ambos', date: '2023-10-12' },
  { id: '5', description: 'Jantar Fora', amount: 200, type: 'despesa', category: 'Lazer/Restaurantes', user: 'Ambos', date: '2023-10-15' },
];
