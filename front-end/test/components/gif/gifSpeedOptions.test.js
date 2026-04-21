import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GIF_SPEED_PLAYBACK_RATE,
  GIF_SPEED_OPTIONS,
  GIF_SPEED_PLAYBACK_RATES,
} from '../../../src/components/gif/gifSpeedOptions'

describe('gifSpeedOptions', () => {
  it('defines a small fixed set of playback speed options for this sprint', () => {
    expect(GIF_SPEED_OPTIONS).toEqual([
      { id: '0.5x', label: '0.5x', playbackRate: 0.5 },
      { id: '1x', label: '1x', playbackRate: 1 },
      { id: '1.5x', label: '1.5x', playbackRate: 1.5 },
      { id: '2x', label: '2x', playbackRate: 2 },
    ])
  })

  it('exposes playback rates list for quick membership checks', () => {
    expect(GIF_SPEED_PLAYBACK_RATES).toEqual([0.5, 1, 1.5, 2])
  })

  it('uses 1x as default speed and keeps it in the allowed option set', () => {
    expect(DEFAULT_GIF_SPEED_PLAYBACK_RATE).toBe(1)
    expect(GIF_SPEED_PLAYBACK_RATES).toContain(DEFAULT_GIF_SPEED_PLAYBACK_RATE)
  })
})
