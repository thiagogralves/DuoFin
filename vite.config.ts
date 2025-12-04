
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Usando a chave fornecida diretamente no build
      'process.env.API_KEY': JSON.stringify('AIzaSyDGZIl5X1VnHaGOa9JjM6CnNKaFJA8QQmg')
    }
  }
})
