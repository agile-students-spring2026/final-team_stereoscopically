import { afterEach, describe, expect, it, vi } from 'vitest'
import { postJson, postMultipart } from '../../src/services/backendMediaClient'

describe('backendMediaClient', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('throws when multipart upload is called without a file', async () => {
    await expect(
      postMultipart({
        path: '/api/filter/video',
        fileField: 'video',
        file: null,
      })
    ).rejects.toThrow('No file provided')
  })

  it('calls postJson endpoint and returns payload on success', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, id: 'abc123' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const payload = await postJson({
      path: '/api/export/gif',
      payload: { mediaId: 'gif_1' },
    })

    expect(payload).toEqual({ ok: true, id: 'abc123' })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [endpoint, options] = mockFetch.mock.calls[0]
    expect(endpoint).toContain('/api/export/gif')
    expect(options.method).toBe('POST')
    expect(options.headers['Content-Type']).toBe('application/json')
  })

  it('uses backend error message when postJson response is not ok', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Bad request payload' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await expect(
      postJson({
        path: '/api/export/gif',
        payload: { mediaId: null },
        fallbackErrorMessage: 'GIF export failed',
      })
    ).rejects.toThrow('Bad request payload')
  })
})
