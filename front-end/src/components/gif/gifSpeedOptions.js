export const GIF_SPEED_OPTIONS = Object.freeze([
  Object.freeze({ id: '0.5x', label: '0.5x', playbackRate: 0.5 }),
  Object.freeze({ id: '1x', label: '1x', playbackRate: 1 }),
  Object.freeze({ id: '1.5x', label: '1.5x', playbackRate: 1.5 }),
  Object.freeze({ id: '2x', label: '2x', playbackRate: 2 }),
])

export const DEFAULT_GIF_SPEED_PLAYBACK_RATE = 1

export const GIF_SPEED_PLAYBACK_RATES = Object.freeze(
  GIF_SPEED_OPTIONS.map((option) => option.playbackRate)
)
