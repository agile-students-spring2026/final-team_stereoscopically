import { describe, expect, it } from 'vitest'

import { getCreationPreviewUrl, getCreationThumbDescriptor } from '../../src/utils/creationPreviewUrl'

describe('getCreationPreviewUrl', () => {
  it('prefers exported asset id when present', () => {
    const url = getCreationPreviewUrl({
      exportAssetId: 'exp_1',
      editorPayload: { kind: 'image', sourceMediaId: 'src_1', workingMediaId: 'work_1' },
    })

    expect(url).toContain('/api/media/exp_1')
  })

  it('uses working media id for image drafts', () => {
    const url = getCreationPreviewUrl({
      editorPayload: { kind: 'image', sourceMediaId: 'src_1', workingMediaId: 'work_1' },
    })

    expect(url).toContain('/api/media/work_1')
  })

  it('falls back to source media id when working id is missing', () => {
    const url = getCreationPreviewUrl({
      editorPayload: { kind: 'image', sourceMediaId: 'src_2' },
    })

    expect(url).toContain('/api/media/src_2')
  })

  it('supports legacy backendMediaId for image drafts', () => {
    const url = getCreationPreviewUrl({
      editorPayload: { kind: 'image', backendMediaId: 'legacy_2' },
    })

    expect(url).toContain('/api/media/legacy_2')
  })

  it('uses working media id for video drafts without export asset', () => {
    const url = getCreationPreviewUrl({
      editorPayload: { kind: 'video', sourceMediaId: 'src_v', workingMediaId: 'work_v' },
    })

    expect(url).toContain('/api/media/work_v')
  })
})

describe('getCreationThumbDescriptor', () => {
  it('uses video + JPEG poster for video drafts when previewPosterMediaId is set', () => {
    const d = getCreationThumbDescriptor({
      editorPayload: {
        kind: 'video',
        sourceMediaId: 'src_v',
        workingMediaId: 'work_v',
        previewPosterMediaId: 'poster_jpg_1',
      },
    })
    expect(d.mode).toBe('video')
    expect(d.kind).toBe('video')
    expect(d.url).toContain('/api/media/work_v')
    expect(d.posterUrl).toContain('/api/media/poster_jpg_1')
  })

  it('falls back to video URL for video drafts without poster', () => {
    const d = getCreationThumbDescriptor({
      editorPayload: { kind: 'video', workingMediaId: 'work_v' },
    })
    expect(d.mode).toBe('video')
    expect(d.url).toContain('/api/media/work_v')
    expect(d.posterUrl).toBeNull()
  })

  it('uses image mode for exported video rows (preview is GIF asset)', () => {
    const d = getCreationThumbDescriptor({
      exportAssetId: 'gif_export_1',
      editorPayload: {
        kind: 'video',
        workingMediaId: 'work_v',
        previewPosterMediaId: 'poster_jpg_1',
      },
    })
    expect(d.mode).toBe('image')
    expect(d.url).toContain('/api/media/gif_export_1')
    expect(d.posterUrl).toBeNull()
  })
})