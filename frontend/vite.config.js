import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  server:{
    host:"0.0.0.0",
    fs:{
      strict:false,
    },
    proxy: {
      // Proxy API calls to backend, but let React Router handle /pc/ routes
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  plugins: [react()],
})
