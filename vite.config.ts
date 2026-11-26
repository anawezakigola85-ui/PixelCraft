import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // loadEnv with an empty prefix reads all .env keys so the dev-only proxy
  // target can be configured without exposing it to the browser bundle.
  const env = loadEnv(mode, process.cwd(), '')
  const backend = (env.BACKEND_PROXY_TARGET || env.VITE_API_BASE_URL || 'http://localhost:3001').replace(/\/+$/, '')

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: backend,
          changeOrigin: true,
        },
      },
    },
    build: { target: 'es2022' },
  }
})
