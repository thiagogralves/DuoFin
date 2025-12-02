import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO OBRIGATÓRIA ---
// Substitua os valores abaixo pelos dados do seu projeto no Supabase
// Você encontra isso em: Project Settings -> API
const SUPABASE_URL = 'https://flneoarypfioxannmlzx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_IwjbveNasbtYMSM9M7_3OA_-I_IKncZ';

// Verificação simples para avisar se esqueceu de configurar
if (SUPABASE_URL.includes('SUA_URL') || SUPABASE_ANON_KEY.includes('SUA_CHAVE')) {
  console.warn('⚠️ ATENÇÃO: As chaves do Supabase não foram configuradas no arquivo services/supabase.ts');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
