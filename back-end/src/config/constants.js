export const PORT = process.env.PORT || 4000
export const BCRYPT_COST =
	typeof process.env.BCRYPT_COST !== 'undefined' && Number.isFinite(Number(process.env.BCRYPT_COST))
		? Math.min(14, Math.max(10, Number(process.env.BCRYPT_COST)))
		: 11
export const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024
export const MAX_EXPORT_DIMENSION = 4096
export const MEDIA_TTL_MS = 10 * 60 * 1000
export const MEDIA_PURGE_INTERVAL_MS = 60 * 1000

export const DEFAULT_GIF_RESIZE_PRESET = 'square'
export const DEFAULT_GIF_RESIZE_BORDER_COLOR = '#000000'
export const GIF_RESIZE_PRESET_DIMENSIONS = {
	square: { width: 320, height: 320 },
	landscape: { width: 320, height: 180 },
	portrait: { width: 180, height: 320 },
}
