import { describe, expect, it } from 'vitest'
import {
  asNumberOrFallback,
  clamp,
  getContainedContentFrame,
  getSafeFrame,
} from '../../src/utils/overlayPlacement'

describe('overlayPlacement utils', () => {
  it('clamp bounds values correctly', () => {
    expect(clamp(10, 0, 5)).toBe(5)
    expect(clamp(-1, 0, 5)).toBe(0)
    expect(clamp(3, 0, 5)).toBe(3)
  })

  it('asNumberOrFallback parses numbers and falls back for invalid values', () => {
    expect(asNumberOrFallback('12', 4)).toBe(12)
    expect(asNumberOrFallback('not-a-number', 4)).toBe(4)
  })

  it('getSafeFrame applies sensible defaults for invalid frames', () => {
    const frame = getSafeFrame(null, { width: 640, height: 360 })
    expect(frame).toEqual({ left: 0, top: 0, width: 640, height: 360 })
  })

  it('getContainedContentFrame keeps media centered in frame with matching aspect fit', () => {
    const contained = getContainedContentFrame({
      frameLeft: 0,
      frameTop: 0,
      frameWidth: 400,
      frameHeight: 200,
      naturalWidth: 100,
      naturalHeight: 100,
    })

    expect(contained.width).toBe(200)
    expect(contained.height).toBe(200)
    expect(contained.left).toBe(100)
    expect(contained.top).toBe(0)
  })
})
