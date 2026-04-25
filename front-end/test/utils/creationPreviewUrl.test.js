import { describe, expect, it } from 'vitest'

import { getCreationPreviewUrl } from '../../src/utils/creationPreviewUrl'

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