import { describe, expect, it } from 'vitest'

import {
  buildImageCreationPayload,
  buildVideoCreationPayload,
  defaultCreationTitle,
} from '../../src/utils/buildCreationPayload'

describe('buildCreationPayload', () => {
  it('builds image payload with source + working ids', () => {
    const payload = buildImageCreationPayload({
      sourceMediaId: 'src_img_1',
      workingMediaId: 'work_img_1',
      selectedImageFilterPreset: 'sepia',
    })

    expect(payload.version).toBe(3)
    expect(payload.sourceMediaId).toBe('src_img_1')
    expect(payload.workingMediaId).toBe('work_img_1')
    expect(payload.backendMediaId).toBe('work_img_1')
    expect(payload.selectedImageFilterPreset).toBe('sepia')
  })

  it('builds video payload with defaults and media id fallback', () => {
    const payload = buildVideoCreationPayload({ sourceMediaId: 'src_vid_1' })

    expect(payload.version).toBe(3)
    expect(payload.sourceMediaId).toBe('src_vid_1')
    expect(payload.workingMediaId).toBe('src_vid_1')
    expect(payload.backendMediaId).toBe('src_vid_1')
    expect(payload.trimRange).toEqual({ start: 0, end: 0 })
    expect(payload.previewPosterMediaId).toBeNull()
  })

  it('includes previewPosterMediaId when provided', () => {
    const payload = buildVideoCreationPayload({
      sourceMediaId: 'src_vid_1',
      workingMediaId: 'work_vid_1',
      previewPosterMediaId: 'poster_1',
    })
    expect(payload.previewPosterMediaId).toBe('poster_1')
  })

  it('derives default title from filename', () => {
    const title = defaultCreationTitle(new File(['x'], 'sunset.png', { type: 'image/png' }))
    expect(title).toBe('sunset')
  })
})
