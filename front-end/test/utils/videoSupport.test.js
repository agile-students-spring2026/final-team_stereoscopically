// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { isVideoTypeSupported } from '../../src/utils/videoSupport'

describe('isVideoTypeSupported', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns false when value is not a File instance', () => {
    expect(isVideoTypeSupported(null)).toBe(false)
    expect(isVideoTypeSupported({ type: 'video/mp4' })).toBe(false)
  })

  it('returns false when file has no MIME type', () => {
    const file = new File(['abc'], 'clip.mp4', { type: '' })
    expect(isVideoTypeSupported(file)).toBe(false)
  })

  it('returns true when browser can play the file MIME type', () => {
    const canPlayType = vi.fn(() => 'probably')
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'video') {
        return { canPlayType }
      }
      return document.createElement(tagName)
    })

    const file = new File(['abc'], 'clip.mp4', { type: 'video/mp4' })
    expect(isVideoTypeSupported(file)).toBe(true)
    expect(canPlayType).toHaveBeenCalledWith('video/mp4')
  })

  it('returns false when browser cannot play the file MIME type', () => {
    const canPlayType = vi.fn(() => '')
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'video') {
        return { canPlayType }
      }
      return document.createElement(tagName)
    })

    const file = new File(['abc'], 'clip.mov', { type: 'video/quicktime' })
    expect(isVideoTypeSupported(file)).toBe(false)
  })
})
