import {
  DEFAULT_GIF_SPEED_PLAYBACK_RATE,
  GIF_SPEED_PLAYBACK_RATES,
} from './gifSpeedOptions'
import {
  DEFAULT_GIF_TEXT_OVERLAY_SETTINGS,
  GIF_TEXT_COLOR_REGEX,
  MAX_GIF_TEXT_CONTENT_LENGTH,
  MAX_GIF_TEXT_POSITION_PERCENT,
  MAX_GIF_TEXT_SIZE,
  MIN_GIF_TEXT_POSITION_PERCENT,
  MIN_GIF_TEXT_SIZE,
} from './gifEditorConstants'

export const GIF_FLOW_TOOLS = Object.freeze({
  EDITOR: 'editor',
  FILTERS_MAIN: 'filters-main',
  PRESET_FILTERS: 'preset-filters',
  TEXT: 'text',
  SPEED: 'speed',
  RESIZE: 'resize',
  TRIM: 'trim',
})

const clampNumber = (value, min, max) => Math.min(Math.max(value, min), max)

export const createInitialGifTextSettings = () => ({
  text: DEFAULT_GIF_TEXT_OVERLAY_SETTINGS.text,
  size: DEFAULT_GIF_TEXT_OVERLAY_SETTINGS.size,
  color: DEFAULT_GIF_TEXT_OVERLAY_SETTINGS.color,
  position: { ...DEFAULT_GIF_TEXT_OVERLAY_SETTINGS.position },
})

export const sanitizeGifTextSettings = (nextSettings) => {
  const fallback = createInitialGifTextSettings()
  const rawText = typeof nextSettings?.text === 'string' ? nextSettings.text : fallback.text
  const rawSize = Number(nextSettings?.size)
  const rawColor = nextSettings?.color
  const rawX = Number(nextSettings?.position?.x)
  const rawY = Number(nextSettings?.position?.y)

  return {
    text: rawText.slice(0, MAX_GIF_TEXT_CONTENT_LENGTH),
    size: Number.isFinite(rawSize)
      ? clampNumber(rawSize, MIN_GIF_TEXT_SIZE, MAX_GIF_TEXT_SIZE)
      : fallback.size,
    color:
      typeof rawColor === 'string' && GIF_TEXT_COLOR_REGEX.test(rawColor)
        ? rawColor
        : fallback.color,
    position: {
      x: Number.isFinite(rawX)
        ? clampNumber(rawX, MIN_GIF_TEXT_POSITION_PERCENT, MAX_GIF_TEXT_POSITION_PERCENT)
        : fallback.position.x,
      y: Number.isFinite(rawY)
        ? clampNumber(rawY, MIN_GIF_TEXT_POSITION_PERCENT, MAX_GIF_TEXT_POSITION_PERCENT)
        : fallback.position.y,
    },
  }
}

export const createInitialGifFlowState = () => ({
  activeTool: GIF_FLOW_TOOLS.EDITOR,
  selectedSpeedPlaybackRate: DEFAULT_GIF_SPEED_PLAYBACK_RATE,
  textOverlay: createInitialGifTextSettings(),
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

export const resetGifFlowState = (state, { preserveSelectedSpeed = false } = {}) => {
  const nextState = createInitialGifFlowState()

  if (preserveSelectedSpeed && GIF_SPEED_PLAYBACK_RATES.includes(state?.selectedSpeedPlaybackRate)) {
    nextState.selectedSpeedPlaybackRate = state.selectedSpeedPlaybackRate
  }

  return nextState
}
