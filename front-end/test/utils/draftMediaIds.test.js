import { describe, expect, it } from 'vitest'

import { buildDraftMediaIds, resolveDraftMediaIds } from '../../src/utils/draftMediaIds'

describe('draftMediaIds utils', () => {
  it('resolves working and source ids from Option B payload', () => {
    const result = resolveDraftMediaIds({
      sourceMediaId: 'src_1',
      workingMediaId: 'work_1',
    })

    expect(result).toEqual({
      sourceMediaId: 'src_1',
      workingMediaId: 'work_1',
      resumeMediaId: 'work_1',
    })
  })

  it('falls back to source when working id is missing', () => {
    const result = resolveDraftMediaIds({ sourceMediaId: 'src_2' })

    expect(result).toEqual({
      sourceMediaId: 'src_2',
      workingMediaId: null,
      resumeMediaId: 'src_2',
    })
  })

  it('supports legacy backendMediaId payloads', () => {
    const result = resolveDraftMediaIds({ backendMediaId: 'legacy_1' })

    expect(result).toEqual({
      sourceMediaId: 'legacy_1',
      workingMediaId: 'legacy_1',
      resumeMediaId: 'legacy_1',
    })
  })

  it('builds normalized ids for new payloads', () => {
    const result = buildDraftMediaIds({ sourceMediaId: ' src_3 ', workingMediaId: ' work_3 ' })

    expect(result).toEqual({
      sourceMediaId: 'src_3',
      workingMediaId: 'work_3',
    })
  })

  it('uses source id as working fallback when needed', () => {
    const result = buildDraftMediaIds({ sourceMediaId: 'src_4' })

    expect(result).toEqual({
      sourceMediaId: 'src_4',
      workingMediaId: 'src_4',
    })
  })
})
