import { describe, expect, it } from 'vitest'
import { DEFAULT_GIF_SPEED_PLAYBACK_RATE } from '../../../src/components/gif/gifSpeedOptions'
import {
  createInitialGifTextSettings,
  createInitialGifFlowState,
  GIF_FLOW_TOOLS,
  resetGifFlowState,
  sanitizeGifTextSettings,
  setGifFlowActiveTool,
  setGifFlowSelectedSpeed,
} from '../../../src/components/gif/gifFlowState'

describe('gifFlowState', () => {
  it('creates active GIF flow state with editor tool, default speed, and default text settings', () => {
    expect(createInitialGifFlowState()).toEqual({
      activeTool: GIF_FLOW_TOOLS.EDITOR,
      selectedSpeedPlaybackRate: DEFAULT_GIF_SPEED_PLAYBACK_RATE,
      textOverlay: createInitialGifTextSettings(),
    })
  })

  it('updates active tool without changing selected speed', () => {
    const initial = {
      activeTool: GIF_FLOW_TOOLS.EDITOR,
      selectedSpeedPlaybackRate: 1.5,
      textOverlay: {
        text: 'Watermark',
        fontFamily: 'Georgia',
        size: 22,
        color: '#0099FF',
        position: { x: 10, y: 15 },
      },
    }

    expect(setGifFlowActiveTool(initial, GIF_FLOW_TOOLS.FILTERS_MAIN)).toEqual({
      activeTool: GIF_FLOW_TOOLS.FILTERS_MAIN,
      selectedSpeedPlaybackRate: 1.5,
      textOverlay: {
        text: 'Watermark',
        fontFamily: 'Georgia',
        size: 22,
        color: '#0099FF',
        position: { x: 10, y: 15 },
      },
    })
  })

  it('updates selected speed when provided a supported option', () => {
    const initial = {
      ...createInitialGifFlowState(),
      textOverlay: {
        text: 'Clip title',
        fontFamily: 'Arial',
        size: 30,
        color: '#AA5500',
        position: { x: 44, y: 77 },
      },
    }

    expect(setGifFlowSelectedSpeed(initial, 2)).toEqual({
      activeTool: GIF_FLOW_TOOLS.EDITOR,
      selectedSpeedPlaybackRate: 2,
      textOverlay: {
        text: 'Clip title',
        fontFamily: 'Arial',
        size: 30,
        color: '#AA5500',
        position: { x: 44, y: 77 },
      },
    })
  })

  it('falls back to default selected speed when provided unsupported value', () => {
    const initial = {
      activeTool: GIF_FLOW_TOOLS.FILTERS_MAIN,
      selectedSpeedPlaybackRate: 2,
      textOverlay: createInitialGifTextSettings(),
    }

    expect(setGifFlowSelectedSpeed(initial, 1.75)).toEqual({
      activeTool: GIF_FLOW_TOOLS.FILTERS_MAIN,
      selectedSpeedPlaybackRate: DEFAULT_GIF_SPEED_PLAYBACK_RATE,
      textOverlay: createInitialGifTextSettings(),
    })
  })

  it('keeps selected speed in sync when user navigates between GIF tools', () => {
    const withSpeed = setGifFlowSelectedSpeed(createInitialGifFlowState(), 0.5)

    expect(setGifFlowActiveTool(withSpeed, GIF_FLOW_TOOLS.FILTERS_MAIN)).toEqual({
      activeTool: GIF_FLOW_TOOLS.FILTERS_MAIN,
      selectedSpeedPlaybackRate: 0.5,
      textOverlay: createInitialGifTextSettings(),
    })
  })

  it('resets to default tool and speed for a fresh GIF flow', () => {
    const current = {
      activeTool: GIF_FLOW_TOOLS.SPEED,
      selectedSpeedPlaybackRate: 2,
      textOverlay: {
        text: 'Hello',
        size: 80,
        color: '#00FF00',
        position: { x: 80, y: 20 },
      },
    }

    expect(resetGifFlowState(current)).toEqual({
      activeTool: GIF_FLOW_TOOLS.EDITOR,
      selectedSpeedPlaybackRate: DEFAULT_GIF_SPEED_PLAYBACK_RATE,
      textOverlay: createInitialGifTextSettings(),
    })
  })

  it('can reset tool while preserving selected speed for in-flow media updates', () => {
    const current = {
      activeTool: GIF_FLOW_TOOLS.PRESET_FILTERS,
      selectedSpeedPlaybackRate: 1.5,
      textOverlay: {
        text: 'Overlay',
        fontFamily: 'Helvetica',
        size: 18,
        color: '#FF00FF',
        position: { x: 35, y: 75 },
      },
    }

    expect(resetGifFlowState(current, { preserveSelectedSpeed: true })).toEqual({
      activeTool: GIF_FLOW_TOOLS.EDITOR,
      selectedSpeedPlaybackRate: 1.5,
      textOverlay: createInitialGifTextSettings(),
    })
  })

  it('sanitizes text settings with clamped size, color fallback, and bounded position', () => {
    const next = sanitizeGifTextSettings({
      text: 'x'.repeat(200),
      fontFamily: 'Papyrus',
      size: 400,
      color: 'not-a-hex-color',
      position: { x: -12, y: 134 },
    })

    expect(next).toEqual({
      text: 'x'.repeat(120),
      fontFamily: 'Arial',
      size: 120,
      color: '#FFFFFF',
      position: { x: 0, y: 100 },
    })
  })

  it('keeps valid text settings unchanged', () => {
    const next = sanitizeGifTextSettings({
      text: 'Caption',
      fontFamily: 'Georgia',
      size: 36,
      color: '#123ABC',
      position: { x: 15, y: 65 },
    })

    expect(next).toEqual({
      text: 'Caption',
      fontFamily: 'Georgia',
      size: 36,
      color: '#123ABC',
      position: { x: 15, y: 65 },
    })
  })
})
