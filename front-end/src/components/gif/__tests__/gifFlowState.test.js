import { describe, expect, it } from 'vitest'
import { DEFAULT_GIF_SPEED_PLAYBACK_RATE } from '../gifSpeedOptions'
import {
  createInitialGifFlowState,
  GIF_FLOW_TOOLS,
  setGifFlowActiveTool,
  setGifFlowSelectedSpeed,
} from '../gifFlowState'

describe('gifFlowState', () => {
  it('creates active GIF flow state with editor tool and default speed', () => {
    expect(createInitialGifFlowState()).toEqual({
      activeTool: GIF_FLOW_TOOLS.EDITOR,
      selectedSpeedPlaybackRate: DEFAULT_GIF_SPEED_PLAYBACK_RATE,
    })
  })

  it('updates active tool without changing selected speed', () => {
    const initial = {
      activeTool: GIF_FLOW_TOOLS.EDITOR,
      selectedSpeedPlaybackRate: 1.5,
    }

    expect(setGifFlowActiveTool(initial, GIF_FLOW_TOOLS.FILTERS_MAIN)).toEqual({
      activeTool: GIF_FLOW_TOOLS.FILTERS_MAIN,
      selectedSpeedPlaybackRate: 1.5,
    })
  })

  it('updates selected speed when provided a supported option', () => {
    const initial = createInitialGifFlowState()

    expect(setGifFlowSelectedSpeed(initial, 2)).toEqual({
      activeTool: GIF_FLOW_TOOLS.EDITOR,
      selectedSpeedPlaybackRate: 2,
    })
  })

  it('falls back to default selected speed when provided unsupported value', () => {
    const initial = {
      activeTool: GIF_FLOW_TOOLS.FILTERS_MAIN,
      selectedSpeedPlaybackRate: 2,
    }

    expect(setGifFlowSelectedSpeed(initial, 1.75)).toEqual({
      activeTool: GIF_FLOW_TOOLS.FILTERS_MAIN,
      selectedSpeedPlaybackRate: DEFAULT_GIF_SPEED_PLAYBACK_RATE,
    })
  })

  it('keeps selected speed in sync when user navigates between GIF tools', () => {
    const withSpeed = setGifFlowSelectedSpeed(createInitialGifFlowState(), 0.5)

    expect(setGifFlowActiveTool(withSpeed, GIF_FLOW_TOOLS.FILTERS_MAIN)).toEqual({
      activeTool: GIF_FLOW_TOOLS.FILTERS_MAIN,
      selectedSpeedPlaybackRate: 0.5,
    })
  })
})
