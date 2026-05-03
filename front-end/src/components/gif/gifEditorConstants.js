export const DEFAULT_GIF_RESIZE_PRESET = 'square'
export const DEFAULT_GIF_RESIZE_BORDER_COLOR = '#000000'
export const GIF_TRANSPARENT_BORDER_COLOR = 'transparent'

/** Must match back-end GIF_RESIZE_PRESET_DIMENSIONS (gifMediaService trim pipeline). */
export const GIF_RESIZE_PRESET_DIMENSIONS = Object.freeze({
  square: Object.freeze({ width: 320, height: 320 }),
  landscape: Object.freeze({ width: 320, height: 180 }),
  portrait: Object.freeze({ width: 180, height: 320 }),
})

export const GIF_RESIZE_PRESET_OPTIONS = Object.freeze([
  Object.freeze({ key: 'square', label: 'Square', subtitle: '1:1' }),
  Object.freeze({ key: 'landscape', label: 'Landscape', subtitle: '16:9' }),
  Object.freeze({ key: 'portrait', label: 'Portrait', subtitle: '9:16' }),
])

export const GIF_RESIZE_PRESET_FRAME_CLASSES = Object.freeze({
  square: 'gif-preview-frame--square',
  landscape: 'gif-preview-frame--landscape',
  portrait: 'gif-preview-frame--portrait',
})

export const GIF_RESIZE_BORDER_SWATCHES = Object.freeze([
  Object.freeze({ id: 'transparent', label: 'Transparent', value: GIF_TRANSPARENT_BORDER_COLOR }),
  Object.freeze({ id: 'white', label: 'White', value: '#ffffff' }),
  Object.freeze({ id: 'black', label: 'Black', value: '#000000' }),
])

export const VALID_GIF_RESIZE_PRESETS = new Set(
  GIF_RESIZE_PRESET_OPTIONS.map((option) => option.key)
)

export const GIF_BORDER_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/
export const GIF_BORDER_COLOR_KEYWORDS = new Set([GIF_TRANSPARENT_BORDER_COLOR])

export const DEFAULT_GIF_TEXT_OVERLAY_SETTINGS = Object.freeze({
  text: '',
  fontFamily: 'Arial',
  size: 32,
  color: '#FFFFFF',
  position: Object.freeze({ x: 50, y: 50 }),
})

export const GIF_TEXT_FONT_FAMILIES = Object.freeze(['Arial', 'Helvetica', 'Georgia'])

export const GIF_TEXT_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/
export const MIN_GIF_TEXT_SIZE = 8
export const MAX_GIF_TEXT_SIZE = 120
export const MIN_GIF_TEXT_POSITION_PERCENT = 0
export const MAX_GIF_TEXT_POSITION_PERCENT = 100
export const MAX_GIF_TEXT_CONTENT_LENGTH = 120
