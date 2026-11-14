import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Backend target for the /api dev proxy, in priority order:
// 1. AIC_BACKEND_URL env var  2. port written by start-backend.bat (../.backend-port)  3. 8000
function backendTarget(): string {
  if (process.env.AIC_BACKEND_URL) return process.env.AIC_BACKEND_URL
  try {
    const port = readFileSync(fileURLToPath(new URL('../.backend-port', import.meta.url)), 'utf8').trim()
    if (/^\d+$/.test(port)) return `http://127.0.0.1:${port}`
  } catch { /* no port file yet */ }
  return 'http://127.0.0.1:8000'
}

const target = backendTarget()
console.log(`[ai-commander] /api -> ${target}`)
const proxy = { '/api': { target, changeOrigin: true } }

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, host: '127.0.0.1', proxy },
  preview: { port: 4173, host: '127.0.0.1', proxy },
})
