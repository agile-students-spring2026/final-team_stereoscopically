import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../backendMediaClient', () => ({
  postJson: vi.fn(),
  postMultipart: vi.fn(),
}))

import { postJson } from '../backendMediaClient'
import { exportGifToBackend } from '../backendGifService'

describe('backendGifService exportGifToBackend', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws when mediaId is missing', async () => {
    await expect(exportGifToBackend()).rejects.toThrow('Missing media ID for export')
  })

  it('sends playbackRate when provided and returns normalized response', async () => {
    postJson.mockResolvedValue({
      data: {
        id: 'gif_123',
        url: 'http://localhost:4000/api/media/gif_123',
        downloadUrl: 'http://localhost:4000/api/export/gif_123/download',
      },
    })

    const result = await exportGifToBackend('gif_123', 1.5)

    expect(postJson).toHaveBeenCalledWith({
      path: '/api/export/gif',
      payload: { mediaId: 'gif_123', playbackRate: 1.5 },
      fallbackErrorMessage: 'GIF export failed',
    })

    expect(result).toEqual({
      id: 'gif_123',
      url: 'http://localhost:4000/api/media/gif_123',
      downloadUrl: 'http://localhost:4000/api/export/gif_123/download',
    })
  })

  it('omits playbackRate from payload when not provided', async () => {
    postJson.mockResolvedValue({ id: 'gif_123', url: 'u', downloadUrl: 'd' })

    await exportGifToBackend('gif_123')

    expect(postJson).toHaveBeenCalledWith({
      path: '/api/export/gif',
      payload: { mediaId: 'gif_123' },
      fallbackErrorMessage: 'GIF export failed',
    })
  })
})
