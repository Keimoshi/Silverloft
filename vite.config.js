import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

function daemonOrigin() {
  const explicit = normalizeOrigin(process.env.OD_DAEMON_URL)
  if (explicit) return explicit
  const port = Number(process.env.OD_PORT) || 7456
  return `http://127.0.0.1:${port}`
}

function daemonProxy(target) {
  return {
    target,
    changeOrigin: true,
    configure(proxy) {
      proxy.on('proxyReq', (proxyReq) => {
        // Browser requests are same-origin to the Silverloft Vite dev server,
        // but the open-design daemon still receives the browser Origin header
        // after proxying and rejects unknown frontend ports. The Vite proxy is
        // the trusted local boundary here, so forward as a non-browser client.
        proxyReq.removeHeader('origin')
      })
    },
  }
}

export default defineConfig(() => {
  const target = daemonOrigin()
  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      cors: true,
      proxy: {
        '/api': daemonProxy(target),
        '/artifacts': daemonProxy(target),
        '/frames': daemonProxy(target),
      },
    },
    test: {
      globals: false,
      environment: 'node',
    },
  }
})
