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
  TRIM: 'trim',
})

const DEFAULT_GIF_TEXT_CONTENT = ''
const DEFAULT_GIF_TEXT_SIZE = 32
const DEFAULT_GIF_TEXT_COLOR = '#FFFFFF'
const DEFAULT_GIF_TEXT_POSITION = Object.freeze({ x: 50, y: 50 })
const GIF_TEXT_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/
const MIN_GIF_TEXT_SIZE = 8
const MAX_GIF_TEXT_SIZE = 120
const MIN_GIF_TEXT_POSITION_PERCENT = 0
const MAX_GIF_TEXT_POSITION_PERCENT = 100
const MAX_GIF_TEXT_CONTENT_LENGTH = 120

const clampNumber = (value, min, max) => Math.min(Math.max(value, min), max)

export const createInitialGifTextSettings = () => ({
  text: DEFAULT_GIF_TEXT_CONTENT,
  size: DEFAULT_GIF_TEXT_SIZE,
  color: DEFAULT_GIF_TEXT_COLOR,
  position: { ...DEFAULT_GIF_TEXT_POSITION },
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
