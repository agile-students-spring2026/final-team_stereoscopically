import { ObjectId } from 'mongodb'
import { getMediaBucket } from '../config/database.js'
import { createMedia, getMediaFileInfo, openMediaDownloadStream } from './mediaStore.js'

export const buildMediaUrl = (req, id) => `${req.protocol}://${req.get('host')}/api/media/${id}`
export const buildExportDownloadUrl = (req, id) => `${req.protocol}://${req.get('host')}/api/export/${id}/download`

const streamToBuffer = async (stream) =>
	await new Promise((resolve, reject) => {
		const chunks = []
		stream.on('data', (chunk) => chunks.push(chunk))
		stream.on('end', () => resolve(Buffer.concat(chunks)))
		stream.on('error', reject)
	})

export const loadMedia = async (id) => {
	if (!ObjectId.isValid(id)) return null
	const fileInfo = await getMediaFileInfo(id)
	if (!fileInfo) return null

	const buffer = await streamToBuffer(openMediaDownloadStream(id))

	return {
		buffer,
		mimeType: fileInfo.metadata?.mimeType || fileInfo.contentType || 'application/octet-stream',
		size: fileInfo.length,
		fileName: fileInfo.filename,
		metadata: fileInfo.metadata || {},
	}
}

export const saveMedia = async ({ buffer, mimeType, fileName, metadata = {} }) => {
	const saved = await createMedia({
		buffer,
		filename: fileName || 'upload.bin',
		mimeType,
		metadata,
	})

	return saved.id
}

export const parseLetterboxBackground = (raw) => {
	if (raw == null || raw === '' || raw === 'transparent') {
		return { r: 0, g: 0, b: 0, alpha: 0 }
	}
	if (typeof raw !== 'string') {
		return null
	}
	const hex = raw.trim()
	if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
		return null
	}
	const r = Number.parseInt(hex.slice(1, 3), 16)
	const g = Number.parseInt(hex.slice(3, 5), 16)
	const b = Number.parseInt(hex.slice(5, 7), 16)
	return { r, g, b, alpha: 1 }
}

export const parseCropParams = ({ x, y, width, height, unit = 'pixel', scaleX = 1, scaleY = 1 } = {}) => {
	const xNum = Number(x)
	const yNum = Number(y)
	const widthNum = Number(width)
	const heightNum = Number(height)
	const sx = Number(scaleX)
	const sy = Number(scaleY)

	const invalidNumber = [xNum, yNum, widthNum, heightNum].some((value) => !Number.isFinite(value))
	if (invalidNumber) {
		return { error: { error: 'Invalid crop bounds.', code: 'INVALID_CROP_BOUNDS', status: 400 } }
	}

	if (widthNum <= 0 || heightNum <= 0) {
		return { error: { error: 'Crop width and height must be greater than 0.', code: 'INVALID_CROP_SIZE', status: 400 } }
	}

	if (!['pixel', 'ratio'].includes(unit)) {
		return { error: { error: 'Invalid crop unit.', code: 'INVALID_CROP_UNIT', status: 400 } }
	}

	if (unit === 'pixel') {
		if (!Number.isFinite(sx) || !Number.isFinite(sy) || sx <= 0 || sy <= 0) {
			return { error: { error: 'Invalid crop scale.', code: 'INVALID_CROP_SCALE', status: 400 } }
		}
	}

	if (unit === 'ratio') {
		const ratioValues = [xNum, yNum, widthNum, heightNum]
		const hasOutOfRange = ratioValues.some((value) => value < 0 || value > 1)
		if (hasOutOfRange) {
			return { error: { error: 'Ratio crop values must be between 0 and 1.', code: 'INVALID_CROP_RATIO', status: 400 } }
		}
	}

	return {
		value: {
			xNum,
			yNum,
			widthNum,
			heightNum,
			unit,
			sx,
			sy,
		},
	}
}
