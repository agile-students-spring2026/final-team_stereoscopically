import {
  DEFAULT_GIF_SPEED_PLAYBACK_RATE,
  GIF_SPEED_PLAYBACK_RATES,
} from './gifSpeedOptions'

export const GIF_FLOW_TOOLS = Object.freeze({
  EDITOR: 'editor',
  FILTERS_MAIN: 'filters-main',
  PRESET_FILTERS: 'preset-filters',
  TEXT: 'text',
  SPEED: 'speed',
  RESIZE: 'resize',
})

export const createInitialGifFlowState = () => ({
  activeTool: GIF_FLOW_TOOLS.EDITOR,
  selectedSpeedPlaybackRate: DEFAULT_GIF_SPEED_PLAYBACK_RATE,
})

export const setGifFlowActiveTool = (state, nextTool) => ({
  ...state,
  activeTool: nextTool,
})

export const setGifFlowSelectedSpeed = (state, nextPlaybackRate) => {
  if (!GIF_SPEED_PLAYBACK_RATES.includes(nextPlaybackRate)) {
    return {
      ...state,
      selectedSpeedPlaybackRate: DEFAULT_GIF_SPEED_PLAYBACK_RATE,
    }
  }

  return {
    ...state,
    selectedSpeedPlaybackRate: nextPlaybackRate,
  }
}
