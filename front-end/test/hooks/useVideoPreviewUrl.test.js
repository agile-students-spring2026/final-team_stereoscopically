import { describe, expect, it } from 'vitest'
import { resolveVideoMediaUrl } from '../../src/hooks/useVideoPreviewUrl'

describe('resolveVideoMediaUrl', () => {
  it('returns null for unsupported or empty values', () => {
    expect(resolveVideoMediaUrl(null)).toBeNull()
    expect(resolveVideoMediaUrl(undefined)).toBeNull()
    expect(resolveVideoMediaUrl(123)).toBeNull()
  })

  it('returns string media values as-is', () => {
    expect(resolveVideoMediaUrl('https://cdn.example/video.mp4')).toBe('https://cdn.example/video.mp4')
  })

  it('prefers known object URL fields in priority order', () => {
    expect(resolveVideoMediaUrl({ url: 'url-value', src: 'src-value' })).toBe('url-value')
    expect(resolveVideoMediaUrl({ src: 'src-value', source: 'source-value' })).toBe('src-value')
    expect(resolveVideoMediaUrl({ source: 'source-value', fullUrl: 'full-url-value' })).toBe('source-value')
    expect(resolveVideoMediaUrl({ fullUrl: 'full-url-value' })).toBe('full-url-value')
  })
})
