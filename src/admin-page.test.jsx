// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import AdminPage from './pages/AdminPage.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const fetchCalls = []
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = String(value) }),
    removeItem: vi.fn((key) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

function jsonResponse(value) {
  return Promise.resolve(new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } }))
}

function installAdminFetchMock() {
  fetchCalls.length = 0
  vi.stubGlobal('localStorage', localStorageMock)
  localStorage.clear()
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options = {}) => {
    const url = String(input)
    fetchCalls.push({ url, options })
    if (url === '/api/providers') {
      return jsonResponse({
        providers: {
          openai: { id: 'openai', label: 'OpenAI', hint: 'gpt-image-2', integrated: true, configured: true, source: 'stored' },
          volcengine: { id: 'volcengine', label: 'Volcengine Ark (Doubao)', hint: 'Seedance 2.0', integrated: true, configured: false, source: 'unset' },
        },
      })
    }
    if (url === '/api/admin/media/config' && options.method !== 'PUT') {
      return jsonResponse({
        providers: {
          openai: { configured: true, source: 'stored', apiKeyTail: '1234', baseUrl: 'https://provider.example.invalid/v1' },
          volcengine: { configured: false, source: 'unset', apiKeyTail: '', baseUrl: '' },
        },
      })
    }
    if (url === '/api/admin/media/config' && options.method === 'PUT') {
      return jsonResponse(JSON.parse(options.body))
    }
    return Promise.resolve(new Response('not found', { status: 404 }))
  })
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('AdminPage OpenDesign media config', () => {
  it('loads provider status and admin media config with stored token header', async () => {
    installAdminFetchMock()
    localStorage.setItem('od-admin-token', 'saved-token')
    render(<AdminPage />)

    expect(await screen.findByText('OpenAI')).toBeInTheDocument()
    expect(screen.getByText(/Stored \*1234/)).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://provider.example.invalid/v1')).toBeInTheDocument()

    expect(fetchCalls.find((call) => call.url === '/api/providers')).toBeTruthy()
    expect(fetchCalls.find((call) => call.url === '/api/admin/media/config')?.options.headers).toEqual({ 'x-od-admin-token': 'saved-token' })
  })

  it('saves media config through PUT with x-od-admin-token and remembers token', async () => {
    installAdminFetchMock()
    render(<AdminPage />)

    fireEvent.change(screen.getByLabelText('Admin Token'), { target: { value: 'typed-token' } })
    fireEvent.click(screen.getByRole('button', { name: '加载配置' }))
    await screen.findByText(/Stored \*1234/)

    fireEvent.change(screen.getByLabelText('OpenAI API Key'), { target: { value: 'sk-new' } })
    fireEvent.change(screen.getByLabelText('OpenAI Base URL'), { target: { value: 'https://proxy.example/v1' } })
    fireEvent.click(screen.getByRole('button', { name: '保存全部配置' }))

    await screen.findByText('Provider configuration saved.')
    const putCall = fetchCalls.find((call) => call.url === '/api/admin/media/config' && call.options.method === 'PUT')
    expect(putCall).toBeTruthy()
    expect(putCall.options.headers).toMatchObject({ 'x-od-admin-token': 'typed-token', 'content-type': 'application/json' })
    expect(JSON.parse(putCall.options.body)).toMatchObject({
      providers: {
        openai: { apiKey: 'sk-new', baseUrl: 'https://proxy.example/v1' },
        volcengine: { baseUrl: '' },
      },
    })
    expect(localStorage.setItem).toHaveBeenCalledWith('od-admin-token', 'typed-token')
    expect(fetchCalls.some((call) => call.url === '/api/providers/openai')).toBe(false)
  })
})
