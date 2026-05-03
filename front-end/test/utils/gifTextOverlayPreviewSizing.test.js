import { describe, expect, it } from 'vitest'
import {
  gifExportUniformScale,
  gifTextPreviewOverlayFontCssPx,
} from '../../src/utils/gifTextOverlayPreviewSizing'

describe('gifTextOverlayPreviewSizing', () => {
  it('matches export uniform to backend min(tw/iw, th/ih) for preset', () => {
    const { uniform, tw, th, contentExportW } = gifExportUniformScale(1080, 1920, 'portrait')
    expect({ tw, th }).toEqual({ tw: 180, th: 320 })
    expect(uniform).toBeCloseTo(1 / 6, 6)
    expect(contentExportW).toBe(180)
  })

  it('scales preview font so ratio to contained video matches drawtext/export', () => {
    const px = gifTextPreviewOverlayFontCssPx({
      sourceWidth: 1080,
      sourceHeight: 1920,
      resizePreset: 'portrait',
      uiTextSize: 72,
      contentRectWidthPx: 360,
    })
    const { uniform } = gifExportUniformScale(1080, 1920, 'portrait')
    const exportFont = Math.round(72 * uniform)
    expect(px).toBeCloseTo(exportFont * (360 / (1080 * uniform)), 4)
  })
})
