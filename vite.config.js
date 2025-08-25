import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/binance': {
        target: 'https://api.binance.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/binance/, ''),
      },
      '/api/binance-vision': {
        target: 'https://data-api.binance.vision',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/binance-vision/, ''),
      },
      '/api/mexc': {
        target: 'https://api.mexc.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/mexc/, ''),
      },
    },
  },
})
