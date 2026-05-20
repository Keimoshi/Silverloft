// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import React, { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from '../src/App.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function createInitialApiState() {
  return {
    projects: [
      { id: 'illusory-studio', name: 'Illusory Studio', metadata: { kind: 'media-workspace' }, createdAt: 1760000000000, updatedAt: 1760000000000 },
    ],
    conversations: [
      { id: 'conv_open_design', projectId: 'illusory-studio', title: '默认创作会话', createdAt: 1760000000000, updatedAt: 1760000000000 },
    ],
    messages: [
      {
        id: 'msg_image',
        role: 'user',
        content: '参考 @图片1 生成直播封面',
        params: { ratio: '9:16', size: '1024x1792', quality: 'high' },
        createdAt: '2026-05-05T07:00:00.000Z',
        job: { id: 'job_image', status: 'succeeded', kind: 'image', providerId: 'gpt-image-2' },
        producedFiles: [{ name: 'illusory-image.png', path: 'illusory-image.png', size: 128, mtime: 1760000001000, mime: 'image/png' }],
      },
      {
        id: 'msg_video',
        role: 'user',
        content: '生成 9:16 出场短视频',
        params: { ratio: '9:16', resolution: '720p', duration: 5 },
        createdAt: '2026-05-05T07:05:00.000Z',
        job: { id: 'job_video', status: 'succeeded', kind: 'video', providerId: 'seedance-2' },
        producedFiles: [{ name: 'illusory-video.mp4', path: 'illusory-video.mp4', size: 256, mtime: 1760000002000, mime: 'video/mp4' }],
      },
    ],
    assets: [
      { id: 'asset_image_1', name: 'image_001.png', path: 'image_001.png', size: 128, mtime: 1760000000000, originalName: 'origin.png' },
    ],
    library: [],
    jobs: [],
    generateCalls: [],
    waitCalls: [],
    putMessages: [],
    createdProjects: [],
    createdConversations: [],
  }
}

let apiState = createInitialApiState()

function jsonResponse(value) {
  return Promise.resolve(new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } }))
}

function installFetchMock(overrides = {}) {
  apiState = { ...createInitialApiState(), ...overrides }
  vi.spyOn(window, 'open').mockImplementation(() => null)
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options = {}) => {
    const url = String(input)
    if (url === '/api/projects') {
      if (options.method === 'POST') {
        const body = JSON.parse(options.body)
        apiState.createdProjects.push(body)
        const project = { id: body.id, name: body.name, metadata: body.metadata || {}, createdAt: 1760000003000, updatedAt: 1760000003000 }
        apiState.projects = [project]
        apiState.conversations = [{ id: 'conv_created', projectId: project.id, title: null, createdAt: 1760000003000, updatedAt: 1760000003000 }]
        return jsonResponse({ project, conversationId: 'conv_created' })
      }
      return jsonResponse({ projects: apiState.projects })
    }
    if (url === '/api/projects/illusory-studio/conversations') {
      if (options.method === 'POST') {
        const body = JSON.parse(options.body)
        apiState.createdConversations.push(body)
        const conversation = { id: 'conv_created', projectId: 'illusory-studio', title: body.title || null, createdAt: 1760000003000, updatedAt: 1760000003000 }
        apiState.conversations = [conversation]
        return jsonResponse({ conversation })
      }
      return jsonResponse({ conversations: apiState.conversations })
    }
    if (url === '/api/projects/illusory-studio/conversations/conv_open_design/messages') return jsonResponse({ messages: apiState.messages })
    if (url === '/api/projects/illusory-studio/files/illusory-image.png' || url === '/api/projects/illusory-studio/files/image_001.png') {
      return Promise.resolve(new Response(new Blob(['fake image'], { type: 'image/png' }), { status: 200, headers: { 'content-type': 'image/png' } }))
    }
    if (url === '/api/projects/illusory-studio/files') return jsonResponse({ files: apiState.assets })
    if (url === '/api/projects/illusory-studio/media/tasks?includeDone=true') return jsonResponse({ tasks: apiState.jobs })
    if (url === '/api/asset-library') return jsonResponse(apiState.library)
    if (url === '/api/providers') return jsonResponse({ providers: { openai: { id: 'openai', label: 'OpenAI', configured: true }, volcengine: { id: 'volcengine', label: 'Volcengine Ark (Doubao)', configured: true } } })
    if (url === '/api/media/models') return jsonResponse({
      image: [{ id: 'gpt-image-2', label: 'GPT Image 2', provider: 'openai', default: true }],
      video: [{ id: 'doubao-seedance-2-0-260128', label: 'Doubao-Seedance-2.0', provider: 'volcengine', default: true }],
      aspects: ['9:16', '1:1', '16:9'],
      videoLengthsSec: [5, 8, 13],
    })
    if (url === '/api/projects/illusory-studio/media/generate') {
      apiState.generateCalls.push(JSON.parse(options.body))
      return jsonResponse({ taskId: 'task_new', status: 'running', startedAt: 1760000004000 })
    }
    if (url === '/api/media/tasks/task_new/wait') {
      apiState.waitCalls.push(JSON.parse(options.body))
      return jsonResponse({
        taskId: 'task_new',
        status: 'done',
        startedAt: 1760000004000,
        endedAt: 1760000005000,
        progress: ['queued', 'done'],
        nextSince: 2,
        file: { name: 'media_task_new.png', path: 'media_task_new.png', size: 512, mtime: 1760000005000, mime: 'image/png' },
      })
    }
    if (url === '/api/projects/illusory-studio/conversations/conv_open_design/messages/msg_media_task_new') {
      apiState.putMessages.push(JSON.parse(options.body))
      apiState.messages = [...apiState.messages, JSON.parse(options.body)]
      return jsonResponse({ message: JSON.parse(options.body) })
    }
    return Promise.resolve(new Response('not found', { status: 404 }))
  })
}

async function renderApp() {
  installFetchMock()
  const result = render(<App />)
  await screen.findByText('参考 @图片1 生成直播封面')
  return result
}

async function renderAppShellOnly() {
  installFetchMock()
  return render(<App />)
}

describe('Illusory Studio API driven UI', () => {
  it('renders the styled shell and scrollable content', async () => {
    const { container } = await renderAppShellOnly()
    expect(screen.getByRole('heading', { name: 'Illusory Studio' })).toBeInTheDocument()
    expect(screen.getAllByText('v1.2.8').length).toBeGreaterThan(0)
    expect(screen.getByText('历史生成记录')).toBeInTheDocument()
    expect(container.querySelector('main')?.className).toContain('min-h-screen')
    expect(container.querySelector('main')?.className).not.toContain('overflow-hidden')
  })

  it('navigates between sidebar sections', async () => {
    await renderApp()
    fireEvent.click(screen.getByRole('button', { name: '探索' }))
    expect(screen.getByText('灵感探索')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '任务' }))
    expect(screen.getByRole('heading', { name: '任务' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '资产' }))
    expect(screen.getByRole('heading', { name: '资产库' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '设置' }))
    expect(screen.getByRole('heading', { name: '设置' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '创作' }))
    expect(screen.getByText('历史生成记录')).toBeInTheDocument()
  })

  it('filters history by image/video/all from API messages', async () => {
    await renderApp()
    fireEvent.click(screen.getByRole('button', { name: '筛选图片' }))
    expect(screen.getByText('GPT Image 2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '筛选视频' }))
    expect(screen.getByText('Seedance 2.0')).toBeInTheDocument()
    expect(screen.queryByText('GPT Image 2')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '筛选全部' }))
    expect(screen.getByText('Seedance 2.0')).toBeInTheDocument()
    expect(screen.getByText('GPT Image 2')).toBeInTheDocument()
  })

  it('opens composer from collapsed dock and toggles composer controls', async () => {
    await renderApp()
    fireEvent.click(screen.getByRole('button', { name: /图片制作：使用 @ 引用素材或模板/ }))
    expect(screen.getByText('创作指令')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '视频创作' }))
    expect(screen.getByRole('button', { name: /Doubao-Seedance-2.0/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /13秒/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '图片制作' }))
    expect(screen.getByRole('button', { name: /GPT Image 2/ })).toBeInTheDocument()
  })

  it('opens composer from New Project button', async () => {
    await renderApp()
    fireEvent.click(screen.getByRole('button', { name: /图片制作：使用 @ 引用素材或模板/ }))
    fireEvent.click(screen.getByRole('button', { name: '任务' }))
    expect(screen.queryByText('创作指令')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '新建项目' }))
    await screen.findByText('创作指令')
    expect(screen.getByPlaceholderText('上传参考图后，输入：参考 @图片1 的人物身份，生成 9:16 商业视觉封面。')).toBeInTheDocument()
  })

  it('submits real generate payload with GPT image parameters', async () => {
    await renderApp()
    fireEvent.click(screen.getByRole('button', { name: /图片制作：使用 @ 引用素材或模板/ }))
    fireEvent.change(screen.getByPlaceholderText('上传参考图后，输入：参考 @图片1 的人物身份，生成 9:16 商业视觉封面。'), { target: { value: '参考 @图片1 生成商业封面' } })
    fireEvent.click(screen.getByRole('button', { name: '生成图片' }))
    await waitFor(() => expect(apiState.generateCalls).toHaveLength(1))
    expect(apiState.generateCalls[0]).toMatchObject({
      surface: 'image',
      model: 'gpt-image-2',
      prompt: '参考 @图片1 生成商业封面',
      aspect: '9:16',
      output: expect.stringMatching(/^illusory-image-.*\.png$/),
    })
    await waitFor(() => expect(apiState.waitCalls).toHaveLength(1))
    expect(apiState.waitCalls[0]).toMatchObject({ since: 0, timeoutMs: 25000 })
    await waitFor(() => expect(apiState.putMessages).toHaveLength(1))
    expect(apiState.putMessages[0]).toMatchObject({
      id: 'msg_media_task_new',
      role: 'user',
      content: '参考 @图片1 生成商业封面',
      producedFiles: [{ name: 'media_task_new.png' }],
    })
    expect(await screen.findAllByText('参考 @图片1 生成商业封面')).toHaveLength(2)
    expect(screen.getByText('生成完成，结果已进入历史记录')).toBeInTheDocument()
  })

  it('creates an Illusory OpenDesign media project when none exists', async () => {
    installFetchMock({ projects: [], conversations: [] })
    render(<App />)
    await screen.findByText('历史生成记录')
    await waitFor(() => expect(apiState.createdProjects).toHaveLength(1))
    expect(apiState.createdProjects[0]).toMatchObject({
      id: 'illusory-studio',
      name: 'Illusory Studio',
      metadata: { kind: 'media-workspace' },
    })
  })

  it('saves a history result into asset library through API', async () => {
    await renderApp()
    const saveButtons = screen.getAllByRole('button', { name: '保存到资产库' })
    fireEvent.click(saveButtons[0])
    expect(screen.getByRole('heading', { name: '保存到资产库' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '保存资产' }))
    await screen.findByRole('heading', { name: '资产库' })
    expect(screen.getByText('已保存到资产库')).toBeInTheDocument()
  })

  it('supports asset folders and settings/profile interactions', async () => {
    await renderApp()
    fireEvent.click(screen.getByRole('button', { name: '资产' }))
    fireEvent.change(screen.getByPlaceholderText('文件夹名称'), { target: { value: '测试文件夹' } })
    fireEvent.click(screen.getByRole('button', { name: /在当前文件夹中新建/ }))
    expect(screen.getAllByText('测试文件夹').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: '设置' }))
    const workspaceInput = screen.getByDisplayValue('Illusory Studio Team')
    fireEvent.change(workspaceInput, { target: { value: 'QA Team' } })
    expect(screen.getByDisplayValue('QA Team')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /生成成功后自动保存到资产库/ }))

    fireEvent.click(screen.getByRole('button', { name: /U\s*我的/ }))
    expect(screen.getByRole('heading', { name: '用户中心' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /暗色专注/ }))
    expect(screen.getByText('使用中')).toBeInTheDocument()
  })

  it('previews, downloads, and edits history image cards as real actions', async () => {
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:illusory-download')
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const anchorClicks = []
    const realCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName, options) => {
      const element = realCreateElement(tagName, options)
      if (String(tagName).toLowerCase() === 'a') {
        vi.spyOn(element, 'click').mockImplementation(() => anchorClicks.push({ href: element.href, download: element.download }))
      }
      return element
    })

    await renderApp()
    fireEvent.click(screen.getByRole('button', { name: /图片生成结果 图片 点击预览/ }))
    expect(screen.getByRole('heading', { name: '图片生成结果' })).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: '下载' }).at(-1))
    await waitFor(() => expect(anchorClicks).toHaveLength(1))
    expect(anchorClicks[0].download).toBe('illusory-image.png')
    expect(window.open).not.toHaveBeenCalled()
    expect(createObjectUrl).toHaveBeenCalled()

    fireEvent.click(screen.getAllByRole('button', { name: '编辑' }).at(-1))
    expect(await screen.findByText('创作指令')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('上传参考图后，输入：参考 @图片1 的人物身份，生成 9:16 商业视觉封面。')).toHaveValue('参考 @图片1 生成直播封面')

    revokeObjectUrl.mockRestore()
  })

  it('gives feedback for notification and history action buttons', async () => {
    await renderApp()
    fireEvent.click(screen.getByRole('button', { name: '通知' }))
    expect(screen.getByText('暂无新通知')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: '编辑' })[0])
    expect(screen.getByText(/已载入/)).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: '重新生成' })[0])
    await screen.findByText(/已载入/)

    fireEvent.click(screen.getAllByRole('button', { name: '下载' })[0])
    expect(await screen.findByText(/已开始下载|下载失败/)).toBeInTheDocument()
  })
})
