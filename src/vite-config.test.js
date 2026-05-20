import { describe, expect, it } from 'vitest'
import viteConfig from '../vite.config.js'

function resolveConfig(env = {}) {
  const previous = { OD_DAEMON_URL: process.env.OD_DAEMON_URL, OD_PORT: process.env.OD_PORT }
  if ('OD_DAEMON_URL' in env) process.env.OD_DAEMON_URL = env.OD_DAEMON_URL
  else delete process.env.OD_DAEMON_URL
  if ('OD_PORT' in env) process.env.OD_PORT = env.OD_PORT
  else delete process.env.OD_PORT
  const config = typeof viteConfig === 'function' ? viteConfig({ command: 'serve', mode: 'development' }) : viteConfig
  if (previous.OD_DAEMON_URL === undefined) delete process.env.OD_DAEMON_URL
  else process.env.OD_DAEMON_URL = previous.OD_DAEMON_URL
  if (previous.OD_PORT === undefined) delete process.env.OD_PORT
  else process.env.OD_PORT = previous.OD_PORT
  return config
}

describe('Vite OpenDesign daemon proxy', () => {
  it('proxies API, artifacts, and frames to the default OpenDesign daemon', () => {
    const config = resolveConfig()
    expect(config.server.proxy['/api'].target).toBe('http://127.0.0.1:7456')
    expect(config.server.proxy['/artifacts'].target).toBe('http://127.0.0.1:7456')
    expect(config.server.proxy['/frames'].target).toBe('http://127.0.0.1:7456')
  })

  it('uses OD_DAEMON_URL before OD_PORT and normalizes trailing slashes', () => {
    const config = resolveConfig({ OD_DAEMON_URL: 'http://127.0.0.1:8123/', OD_PORT: '9999' })
    expect(config.server.proxy['/api'].target).toBe('http://127.0.0.1:8123')
  })

  it('uses OD_PORT when OD_DAEMON_URL is absent', () => {
    const config = resolveConfig({ OD_PORT: '8765' })
    expect(config.server.proxy['/frames'].target).toBe('http://127.0.0.1:8765')
  })
})
