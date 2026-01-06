import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente baseadas no modo (development/production)
  // O terceiro argumento vazio '' permite carregar variáveis sem o prefixo VITE_
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Define process.env.API_KEY para ser substituído pelo valor da 
      // variável de ambiente configurada na Vercel durante o build.
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  }
})
