import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  applyVideoFilter,
  convertBackendVideoResultToLocalMedia,
  convertVideoToGif,
  exportGifToBackend,
  trimVideoService,
} from '../backendGifService'
import { postJson, postMultipart } from '../backendMediaClient'

vi.mock('../backendMediaClient', () => ({
  postJson: vi.fn(),
  postMultipart: vi.fn(),
}))

describe('backendGifService', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('throws when convertVideoToGif is called without a file', async () => {
    await expect(convertVideoToGif(null)).rejects.toThrow('No video file provided for conversion')
  })

  it('sends preset when applying video filter and maps response payload', async () => {
    const fakeFile = new File(['video'], 'clip.mp4', { type: 'video/mp4' })
    postMultipart.mockResolvedValue({
      id: 'vid_123',
      type: 'video',
      url: 'https://cdn.example.com/filtered.mp4',
      preset: 'noir',
    })

    const result = await applyVideoFilter(fakeFile, 'noir')

    expect(postMultipart).toHaveBeenCalledWith({
      path: '/api/filter/video',
      fileField: 'video',
      file: fakeFile,
      fields: { preset: 'noir' },
      fallbackErrorMessage: 'Video filter failed',
    })

    expect(result).toEqual({
      id: 'vid_123',
      type: 'video',
      url: 'https://cdn.example.com/filtered.mp4',
      preset: 'noir',
    })
  })

  it('sends trim range, resize preset, and border color when trimming a video', async () => {
    const fakeFile = new File(['video'], 'clip.mp4', { type: 'video/mp4' })
    postMultipart.mockResolvedValue({
      id: 'vid_trim_1',
      type: 'video',
      url: 'https://cdn.example.com/trimmed.mp4',
      size: 1024,
    })

  const result = await trimVideoService(fakeFile, 1.2, 3.4, 'portrait', '#112233')

    expect(postMultipart).toHaveBeenCalledWith({
      path: '/api/trim/video',
      fileField: 'video',
      file: fakeFile,
      fields: {
        trimStart: 1.2,
        trimEnd: 3.4,
        resizePreset: 'portrait',
        resizeBorderColor: '#112233',
      },
      fallbackErrorMessage: 'Video trim failed',
    })

    expect(result).toEqual({
      id: 'vid_trim_1',
      type: 'video',
      url: 'https://cdn.example.com/trimmed.mp4',
      size: 1024,
    })
  })

  it('normalizes export response when payload is wrapped in data', async () => {
    postJson.mockResolvedValue({
      data: {
        id: 'gif_1',
        url: 'https://cdn.example.com/gif_1.gif',
        downloadUrl: 'https://cdn.example.com/gif_1/download',
      },
    })

    const result = await exportGifToBackend('gif_1')

    expect(postJson).toHaveBeenCalledWith({
      path: '/api/export/gif',
      payload: { mediaId: 'gif_1' },
      fallbackErrorMessage: 'GIF export failed',
    })

    expect(result).toEqual({
      id: 'gif_1',
      url: 'https://cdn.example.com/gif_1.gif',
      downloadUrl: 'https://cdn.example.com/gif_1/download',
    })
  })

  it('throws custom error when converting backend video result without URL', async () => {
    await expect(
      convertBackendVideoResultToLocalMedia({}, { fetchErrorMessage: 'Missing video URL' })
    ).rejects.toThrow('Missing video URL')
  })

  it('converts backend video URL to local file/object URL', async () => {
    const blob = new Blob(['video-bytes'], { type: 'video/mp4' })
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => blob,
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await convertBackendVideoResultToLocalMedia({
      url: 'https://cdn.example.com/filtered.mp4',
      fileName: 'filtered-noir.mp4',
      mimeType: 'video/mp4',
    })

    expect(fetchMock).toHaveBeenCalledWith('https://cdn.example.com/filtered.mp4')
    expect(result.file).toBeInstanceOf(File)
    expect(result.fileName).toBe('filtered-noir.mp4')
    expect(result.mimeType).toBe('video/mp4')
    expect(result.objectUrl).toEqual(expect.any(String))
  })
})
