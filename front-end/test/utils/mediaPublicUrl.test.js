import { describe, expect, it } from 'vitest'

import { normalizeUserMediaSrc } from '../../src/utils/mediaPublicUrl.js'

describe('normalizeUserMediaSrc', () => {
  it('keeps same-origin paths as-is', () => {
    expect(normalizeUserMediaSrc('/api/media/507f1f77bcf86cd799439011')).toBe(
      '/api/media/507f1f77bcf86cd799439011',
    )
  })

  it('strips host from internal media URLs', () => {
    expect(normalizeUserMediaSrc('http://localhost:4000/api/media/abc123')).toBe('/api/media/abc123')
  })

  it('leaves external avatars unchanged', () => {
    expect(normalizeUserMediaSrc('https://example.com/pic.png')).toBe('https://example.com/pic.png')
  })

  it('leaves blob URLs unchanged', () => {
    expect(normalizeUserMediaSrc('blob:http://localhost/e7a1')).toBe('blob:http://localhost/e7a1')
  })
})
