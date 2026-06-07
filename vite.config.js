import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '0.0.0.0',
    allowedHosts: ['dental-practice-frontend-production.up.railway.app']
  }
})
