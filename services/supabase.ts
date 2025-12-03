
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO OBRIGATÓRIA ---
// 1. Acesse seu projeto no Supabase (supabase.com/dashboard)
// 2. Vá em Settings (Engrenagem) > API
// 3. Em "Project API keys", copie a chave "anon" "public"
// 4. A chave CORRETA começa com "ey..." (é um token JWT longo)

const SUPABASE_URL = 'https://flneoarypfioxannmlzx.supabase.co';

// ⚠️ COLE SUA CHAVE "anon" "public" ABAIXO (Deve começar com ey...)
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsbmVvYXJ5cGZpb3hhbm5tbHp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NDgwODgsImV4cCI6MjA4MDIyNDA4OH0.toSsXL8knsSXzLaT62k6Uy7mtw54rE84z9UkhujwmAE'; 

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
