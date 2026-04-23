import sharp from 'sharp'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import { tmpdir } from 'os'
import { writeFileSync, unlinkSync } from 'fs'
import { readFile, unlink, writeFile } from 'fs/promises'
import { join } from 'path'
ffmpeg.setFfmpegPath(ffmpegInstaller.path)

import {
	DEFAULT_GIF_RESIZE_BORDER_COLOR,
	DEFAULT_GIF_RESIZE_PRESET,
	GIF_RESIZE_PRESET_DIMENSIONS,
	MAX_EXPORT_DIMENSION,
} from '../config/constants.js'
import { createMedia, getMediaFileInfo, openMediaDownloadStream } from './mediaStore.js'
import { applyImageAdjustments, PRESET_ADJUSTMENTS } from './imageAdjustService.js'
import { normalizeTextOverlayRequest, renderTextOverlayBuffer } from './textOverlayService.js'

const buildMediaUrl = (req, id) => `${req.protocol}://${req.get('host')}/api/media/${id}`
const buildExportDownloadUrl = (req, id) => `${req.protocol}://${req.get('host')}/api/export/${id}/download`

const streamToBuffer = async (stream) =>
	await new Promise((resolve, reject) => {
		const chunks = []
		stream.on('data', (chunk) => chunks.push(chunk))
		stream.on('end', () => resolve(Buffer.concat(chunks)))
		stream.on('error', reject)
	})

const loadMedia = async (id) => {
	const fileInfo = await getMediaFileInfo(id)
	if (!fileInfo) {
		return null
	}

	const buffer = await streamToBuffer(openMediaDownloadStream(id))

	return {
		buffer,
		mimeType: fileInfo.metadata?.mimeType || fileInfo.contentType || 'application/octet-stream',
		size: fileInfo.length,
		fileName: fileInfo.filename,
		metadata: fileInfo.metadata || {},
	}
}

const saveMedia = async ({ buffer, mimeType, fileName, metadata = {} }) => {
	const saved = await createMedia({
		buffer,
		filename: fileName || 'upload.bin',
		mimeType,
		metadata,
	})

	return saved.id
}

const parseLetterboxBackground = (raw) => {
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

const parseCropParams = ({ x, y, width, height, unit = 'pixel', scaleX = 1, scaleY = 1 }) => {
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

const resolveGifResizePreset = (rawPreset) => {
	if (rawPreset == null || rawPreset === '') {
		return { preset: DEFAULT_GIF_RESIZE_PRESET }
	}

	if (typeof rawPreset !== 'string') {
		return {
			error: {
				status: 400,
				error: 'Invalid resize preset.',
				code: 'INVALID_RESIZE_PRESET',
			},
		}
	}

	const preset = rawPreset.toLowerCase().trim()
	if (!GIF_RESIZE_PRESET_DIMENSIONS[preset]) {
		return {
			error: {
				status: 400,
				error: 'Invalid resize preset. Use square, landscape, or portrait.',
				code: 'INVALID_RESIZE_PRESET',
			},
		}
	}

	return { preset }
}

const resolveGifResizeBorderColor = (rawColor) => {
	if (rawColor == null || rawColor === '') {
		return { borderColor: DEFAULT_GIF_RESIZE_BORDER_COLOR }
	}

	if (typeof rawColor !== 'string') {
		return {
			error: {
				status: 400,
				error: 'Invalid resize border color.',
				code: 'INVALID_RESIZE_BORDER_COLOR',
			},
		}
	}

	const color = rawColor.trim()
	if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
		return {
			error: {
				status: 400,
				error: 'Invalid resize border color. Use a #RRGGBB hex value.',
				code: 'INVALID_RESIZE_BORDER_COLOR',
			},
		}
	}

	return { borderColor: color.toLowerCase() }
}

const DEFAULT_GIF_TEXT_SIZE = 32
const DEFAULT_GIF_TEXT_COLOR = '#ffffff'
const DEFAULT_GIF_TEXT_POSITION = { x: 50, y: 50 }
const MAX_GIF_TEXT_LENGTH = 120
const MIN_GIF_TEXT_SIZE = 8
const MAX_GIF_TEXT_SIZE = 120

const parseGifTextOverlay = (rawTextOverlay) => {
	if (rawTextOverlay == null || rawTextOverlay === '') {
		return { value: null }
	}

	let parsedTextOverlay = rawTextOverlay
	if (typeof rawTextOverlay === 'string') {
		try {
			parsedTextOverlay = JSON.parse(rawTextOverlay)
		} catch {
			return {
				error: {
					status: 400,
					error: 'Invalid text overlay payload.',
					code: 'INVALID_TEXT_OVERLAY',
				},
			}
		}
	}

	if (!parsedTextOverlay || typeof parsedTextOverlay !== 'object' || Array.isArray(parsedTextOverlay)) {
		return {
			error: {
				status: 400,
				error: 'Invalid text overlay payload.',
				code: 'INVALID_TEXT_OVERLAY',
			},
		}
	}

	const rawText = parsedTextOverlay.text
	if (typeof rawText !== 'string') {
		return {
			error: {
				status: 400,
				error: 'Invalid text overlay text value.',
				code: 'INVALID_TEXT_OVERLAY_TEXT',
			},
		}
	}

	if (rawText.length > MAX_GIF_TEXT_LENGTH) {
		return {
			error: {
				status: 400,
				error: `Text overlay is too long (max ${MAX_GIF_TEXT_LENGTH} characters).`,
				code: 'INVALID_TEXT_OVERLAY_TEXT',
			},
		}
	}

	if (!rawText.trim()) {
		return { value: null }
	}

	const rawSize = parsedTextOverlay.size
	const size = rawSize == null ? DEFAULT_GIF_TEXT_SIZE : Number(rawSize)
	if (!Number.isFinite(size) || size < MIN_GIF_TEXT_SIZE || size > MAX_GIF_TEXT_SIZE) {
		return {
			error: {
				status: 400,
				error: `Invalid text overlay size. Must be between ${MIN_GIF_TEXT_SIZE} and ${MAX_GIF_TEXT_SIZE}.`,
				code: 'INVALID_TEXT_OVERLAY_SIZE',
			},
		}
	}

	const rawColor = parsedTextOverlay.color == null ? DEFAULT_GIF_TEXT_COLOR : parsedTextOverlay.color
	if (typeof rawColor !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(rawColor.trim())) {
		return {
			error: {
				status: 400,
				error: 'Invalid text overlay color. Use a #RRGGBB hex value.',
				code: 'INVALID_TEXT_OVERLAY_COLOR',
			},
		}
	}

	const rawX = parsedTextOverlay.position?.x
	const rawY = parsedTextOverlay.position?.y
	const x = rawX == null ? DEFAULT_GIF_TEXT_POSITION.x : Number(rawX)
	const y = rawY == null ? DEFAULT_GIF_TEXT_POSITION.y : Number(rawY)

	if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100) {
		return {
			error: {
				status: 400,
				error: 'Invalid text overlay position.',
				code: 'INVALID_TEXT_OVERLAY_POSITION',
			},
		}
	}

	return {
		value: {
			text: rawText,
			size: Math.round(size),
			color: rawColor.trim().toLowerCase(),
			position: {
				x,
				y,
			},
		},
	}
}

const escapeGifDrawtextValue = (value) =>
	String(value)
		.replaceAll('\\', '\\\\')
		.replaceAll(':', '\\:')
		.replaceAll("'", "\\'")
		.replaceAll(',', '\\,')
		.replaceAll('%', '\\%')
		.replaceAll('\r', '')
		.replaceAll('\n', '\\n')

const FONT_FILE = '/System/Library/Fonts/Supplemental/Arial.ttf'

const buildGifDrawtextFilter = (textOverlay) => {

	const xRatio = textOverlay.position.x / 100
	const yRatio = textOverlay.position.y / 100
	const fontColor = `0x${textOverlay.color.slice(1)}`
	const escapedText = escapeGifDrawtextValue(textOverlay.text)
	return `drawtext=fontfile='${FONT_FILE}':text='${escapedText}':fontsize=${textOverlay.size}:fontcolor=${fontColor}:x=(w*${xRatio.toFixed(6)})-(text_w/2):y=(h*${yRatio.toFixed(6)})-(text_h/2)`

}

const staticImageOnly = (media) =>
	media.mimeType?.startsWith('image/') && media.mimeType !== 'image/gif'

export const uploadImage = async (req) => {
	if (!req.file) {
		return { error: { status: 400, error: 'No image file uploaded.', code: 'MISSING_FILE' } }
	}

	if (!req.file.mimetype?.startsWith('image/')) {
		return {
			error: { status: 400, error: 'Unsupported file type. Please upload an image.', code: 'INVALID_TYPE' },
		}
	}

	try {
		const mediaId = await saveMedia({
			buffer: req.file.buffer,
			mimeType: req.file.mimetype,
			fileName: req.file.originalname || 'upload.png',
			metadata: {
				kind: 'image',
			},
		})

		return {
			status: 200,
			data: {
				id: mediaId,
				type: 'image',
				url: buildMediaUrl(req, mediaId),
				mimeType: req.file.mimetype,
				size: req.file.size,
			},
		}
	} catch (error) {
		console.error('Upload image error:', error)
		return { error: { status: 500, error: 'Failed to upload image.', code: 'UPLOAD_FAILED' } }
	}
}

export const uploadVideo = async (req) => {
	if (!req.file) {
		return { error: { status: 400, error: 'No video file uploaded.', code: 'MISSING_FILE' } }
	}

	if (!req.file.mimetype?.startsWith('video/')) {
		return {
			error: { status: 400, error: 'Unsupported file type. Please upload a video.', code: 'INVALID_TYPE' },
		}
	}

	try {
		const mediaId = await saveMedia({
			buffer: req.file.buffer,
			mimeType: req.file.mimetype,
			fileName: req.file.originalname || 'upload.mp4',
			metadata: {
				kind: 'video',
				operation: 'upload',
			},
		})

		return {
			status: 200,
			data: {
				id: mediaId,
				type: 'video',
				url: buildMediaUrl(req, mediaId),
				mimeType: req.file.mimetype,
				size: req.file.size,
			},
		}
	} catch (error) {
		console.error('Upload video error:', error)
		return { error: { status: 500, error: 'Failed to upload video.', code: 'UPLOAD_FAILED' } }
	}
}

export const cropImage = async (req) => {
	const { mediaId, x, y, width, height, unit = 'pixel', scaleX = 1, scaleY = 1 } = req.body ?? {}

	if (!mediaId) {
		return { error: { status: 400, error: 'Missing mediaId.', code: 'MISSING_MEDIA_ID' } }
	}

	const media = await loadMedia(mediaId)
	if (!media) {
		return { error: { status: 404, error: 'Media not found.', code: 'MEDIA_NOT_FOUND' } }
	}

	const parsed = parseCropParams({ x, y, width, height, unit, scaleX, scaleY })
	if (parsed.error) {
		return { error: { status: parsed.error.status, error: parsed.error.error, code: parsed.error.code } }
	}

	try {
		const { xNum, yNum, widthNum, heightNum, sx, sy } = parsed.value
		const pipeline = sharp(media.buffer).rotate()
		const metadata = await pipeline.metadata()

		const naturalW = metadata.width
		const naturalH = metadata.height

		if (!naturalW || !naturalH) {
			throw new Error('Unable to determine image dimensions for crop.')
		}

		let left
		let top
		let cw
		let ch

		if (unit === 'ratio') {
			left = Math.floor(xNum * naturalW)
			top = Math.floor(yNum * naturalH)
			cw = Math.round(widthNum * naturalW)
			ch = Math.round(heightNum * naturalH)
		} else {
			left = Math.floor(xNum * sx)
			top = Math.floor(yNum * sy)
			cw = Math.round(widthNum * sx)
			ch = Math.round(heightNum * sy)
		}

		const safeLeft = Math.max(0, Math.min(left, naturalW - 1))
		const safeTop = Math.max(0, Math.min(top, naturalH - 1))
		const safeW = Math.max(1, Math.min(cw, naturalW - safeLeft))
		const safeH = Math.max(1, Math.min(ch, naturalH - safeTop))

		const croppedBuffer = await pipeline
			.extract({
				left: safeLeft,
				top: safeTop,
				width: safeW,
				height: safeH,
			})
			.png()
			.toBuffer()

		const cropId = await saveMedia({
			buffer: croppedBuffer,
			mimeType: 'image/png',
			fileName: 'cropped.png',
			metadata: {
				kind: 'image',
				sourceMediaId: mediaId,
				operation: 'crop',
			},
		})

		return {
			status: 200,
			data: {
				id: cropId,
				type: 'image',
				url: buildMediaUrl(req, cropId),
				mimeType: 'image/png',
				size: croppedBuffer.length,
				width: safeW,
				height: safeH,
			},
		}
	} catch (error) {
		console.error('Sharp Crop Error:', error)
		return { error: { status: 500, error: 'Failed to process image crop.', code: 'CROP_FAILED' } }
	}
}

export const exportImage = async (req) => {
	const { mediaId, width, height, letterboxColor } = req.body ?? {}
	const targetWidth = Number(width)
	const targetHeight = Number(height)
	const background = parseLetterboxBackground(letterboxColor)

	if (background === null) {
		return {
			error: {
				status: 400,
				error: 'Invalid letterbox color. Use "transparent" or a #RRGGBB hex value.',
				code: 'INVALID_LETTERBOX_COLOR',
			},
		}
	}

	if (!mediaId) {
		return { error: { status: 400, error: 'Missing mediaId for export.', code: 'MISSING_MEDIA_ID' } }
	}

	if (
		!Number.isInteger(targetWidth) ||
		!Number.isInteger(targetHeight) ||
		targetWidth <= 0 ||
		targetHeight <= 0 ||
		targetWidth > MAX_EXPORT_DIMENSION ||
		targetHeight > MAX_EXPORT_DIMENSION
	) {
		return { error: { status: 400, error: 'Invalid export dimensions.', code: 'INVALID_DIMENSIONS' } }
	}

	const media = await loadMedia(mediaId)
	if (!media) {
		return { error: { status: 404, error: 'Media not found.', code: 'MEDIA_NOT_FOUND' } }
	}

	if (!media.mimeType?.startsWith('image/') || media.mimeType === 'image/gif') {
		return {
			error: {
				status: 400,
				error: 'Only static image export is supported.',
				code: 'UNSUPPORTED_MEDIA_TYPE',
			},
		}
	}

	try {
		const resizedBuf = await sharp(media.buffer)
			.rotate()
			.resize(targetWidth, targetHeight, {
				fit: 'inside',
				withoutEnlargement: false,
			})
			.png()
			.toBuffer()

		const { width: resizedW, height: resizedH } = await sharp(resizedBuf).metadata()
		const rw = resizedW ?? targetWidth
		const rh = resizedH ?? targetHeight
		const left = Math.max(0, Math.round((targetWidth - rw) / 2))
		const top = Math.max(0, Math.round((targetHeight - rh) / 2))

		const exportedBuffer = await sharp({
			create: {
				width: targetWidth,
				height: targetHeight,
				channels: 4,
				background,
			},
		})
			.composite([{ input: resizedBuf, left, top }])
			.png()
			.toBuffer()

		const fileName = `sticker-${targetWidth}x${targetHeight}.png`
		const exportId = await saveMedia({
			buffer: exportedBuffer,
			mimeType: 'image/png',
			fileName,
			metadata: {
				kind: 'image',
				sourceMediaId: mediaId,
				operation: 'export',
				width: targetWidth,
				height: targetHeight,
				letterboxColor: letterboxColor ?? 'transparent',
			},
		})

		return {
			status: 200,
			data: {
				id: exportId,
				type: 'image',
				url: buildMediaUrl(req, exportId),
				downloadUrl: buildExportDownloadUrl(req, exportId),
				mimeType: 'image/png',
				width: targetWidth,
				height: targetHeight,
				size: exportedBuffer.length,
				fileName,
			},
		}
	} catch (error) {
		console.error('Export image error:', error)
		return { error: { status: 500, error: 'Failed to export image.', code: 'EXPORT_FAILED' } }
	}
}

export const adjustImage = async (req) => {
	const {
		mediaId,
		brightness,
		contrast,
		saturation,
		hue,
		grayscale,
		sepia,
		sharpness,
	} = req.body ?? {}

	if (!mediaId) {
		return { error: { status: 400, error: 'Missing mediaId.', code: 'MISSING_MEDIA_ID' } }
	}

	const media = await loadMedia(mediaId)
	if (!media) {
		return { error: { status: 404, error: 'Media not found.', code: 'MEDIA_NOT_FOUND' } }
	}

	if (!staticImageOnly(media)) {
		return {
			error: {
				status: 400,
				error: 'Only static images are supported (not GIF).',
				code: 'UNSUPPORTED_MEDIA_TYPE',
			},
		}
	}

	const opts = {
		brightness: brightness ?? 1,
		contrast: contrast ?? 1,
		saturation: saturation ?? 1,
		hue: hue ?? 0,
		grayscale: grayscale ?? 0,
		sepia: sepia ?? 0,
		sharpness: sharpness ?? 1,
	}

	const numericKeys = ['brightness', 'contrast', 'saturation', 'hue', 'grayscale', 'sepia', 'sharpness']
	for (const k of numericKeys) {
		const v = opts[k]
		if (typeof v !== 'number' || !Number.isFinite(v)) {
			return { error: { status: 400, error: 'Adjustment values must be finite numbers.', code: 'INVALID_ADJUST_PARAMS' } }
		}
	}

	try {
		const out = await applyImageAdjustments(media.buffer, opts)
		const newId = await saveMedia({
			buffer: out,
			mimeType: 'image/png',
			fileName: 'adjusted.png',
			metadata: {
				kind: 'image',
				sourceMediaId: mediaId,
				operation: 'adjust',
				adjustments: opts,
			},
		})

		const meta = await sharp(out).metadata()
		return {
			status: 200,
			data: {
				id: newId,
				type: 'image',
				url: buildMediaUrl(req, newId),
				mimeType: 'image/png',
				size: out.length,
				width: meta.width,
				height: meta.height,
			},
		}
	} catch (error) {
		console.error('Adjust image error:', error)
		return { error: { status: 500, error: 'Failed to adjust image.', code: 'ADJUST_FAILED' } }
	}
}

export const applyPresetImageFilter = async (req) => {
	const { mediaId, preset } = req.body ?? {}

	if (!mediaId) {
		return { error: { status: 400, error: 'Missing mediaId.', code: 'MISSING_MEDIA_ID' } }
	}

	const key = typeof preset === 'string' ? preset.toLowerCase() : ''
	const presetOpts = PRESET_ADJUSTMENTS[key]
	if (!presetOpts) {
		return { error: { status: 400, error: 'Invalid or unsupported preset.', code: 'INVALID_PRESET' } }
	}

	const media = await loadMedia(mediaId)
	if (!media) {
		return { error: { status: 404, error: 'Media not found.', code: 'MEDIA_NOT_FOUND' } }
	}

	if (!staticImageOnly(media)) {
		return {
			error: {
				status: 400,
				error: 'Only static images are supported (not GIF).',
				code: 'UNSUPPORTED_MEDIA_TYPE',
			},
		}
	}

	try {
		const out = await applyImageAdjustments(media.buffer, presetOpts)
		const newId = await saveMedia({
			buffer: out,
			mimeType: 'image/png',
			fileName: `preset-${key}.png`,
			metadata: {
				kind: 'image',
				sourceMediaId: mediaId,
				operation: 'preset-filter',
				preset: key,
			},
		})

		const meta = await sharp(out).metadata()
		return {
			status: 200,
			data: {
				id: newId,
				type: 'image',
				url: buildMediaUrl(req, newId),
				mimeType: 'image/png',
				size: out.length,
				width: meta.width,
				height: meta.height,
				preset: key,
			},
		}
	} catch (error) {
		console.error('Preset filter error:', error)
		return { error: { status: 500, error: 'Failed to apply preset filter.', code: 'PRESET_FILTER_FAILED' } }
	}
}

export const addTextToImage = async (req) => {
	const {
		mediaId,
		text,
		x,
		y,
		fontFamily,
		fontSize,
		color,
	} = req.body ?? {}

	if (!mediaId) {
		return { error: { status: 400, error: 'Missing mediaId.', code: 'MISSING_MEDIA_ID' } }
	}

	const media = await loadMedia(mediaId)
	if (!media) {
		return { error: { status: 404, error: 'Media not found.', code: 'MEDIA_NOT_FOUND' } }
	}

	if (!media.mimeType?.startsWith('image/')) {
		return {
			error: {
				status: 400,
				error: 'Only image text overlay is supported.',
				code: 'UNSUPPORTED_MEDIA_TYPE',
			},
		}
	}

	if (typeof text !== 'string') {
		return { error: { status: 400, error: 'Invalid text payload.', code: 'INVALID_TEXT_PAYLOAD' } }
	}

	if (!text.trim()) {
		return {
			status: 200,
			data: {
				id: mediaId,
				type: 'image',
				url: buildMediaUrl(req, mediaId),
				mimeType: media.mimeType,
				size: media.size,
				noOp: true,
			},
		}
	}

	const parsed = normalizeTextOverlayRequest({
		text,
		x,
		y,
		fontFamily,
		fontSize,
		color,
	})

	if (parsed.error) {
		return { error: parsed.error }
	}

	try {
		const { buffer: renderedBuffer, width, height } = await renderTextOverlayBuffer({
			imageBuffer: media.buffer,
			...parsed.value,
		})

		const textId = await saveMedia({
			buffer: renderedBuffer,
			mimeType: 'image/png',
			fileName: 'text-overlay.png',
			metadata: {
				kind: 'image',
				sourceMediaId: mediaId,
				operation: 'text-overlay',
			},
		})

		return {
			status: 200,
			data: {
				id: textId,
				type: 'image',
				url: buildMediaUrl(req, textId),
				mimeType: 'image/png',
				size: renderedBuffer.length,
				width,
				height,
				noOp: false,
			},
		}
	} catch (error) {
		console.error('Text overlay failed:', error)
		return {
			error: {
				status: 500,
				error: 'Failed to render text overlay.',
				code: 'TEXT_RENDER_FAILED',
			},
		}
	}
}

export const getMediaContent = async (id) => {
	const media = await loadMedia(id)
	if (!media) {
		return { error: { status: 404, error: 'Media not found.', code: 'MEDIA_NOT_FOUND' } }
	}

	return {
		status: 200,
		data: media.buffer,
		headers: {
			'Content-Type': media.mimeType,
			'Cache-Control': 'no-store',
		},
	}
}

export const getExportDownloadContent = async (id) => {
	const media = await loadMedia(id)
	if (!media) {
		return { error: { status: 404, error: 'Media not found.', code: 'MEDIA_NOT_FOUND' } }
	}

	return {
		status: 200,
		data: media.buffer,
		headers: {
			'Content-Type': media.mimeType,
			'Cache-Control': 'no-store',
			'Content-Disposition': `attachment; filename="${media.fileName || 'sticker.png'}"`,
		},
	}
}

export const trimVideo = async (req) => {
	const { trimStart, trimEnd, resizePreset, resizeBorderColor, textOverlay } = req.body ?? {}

	if (!req.file) {
		return { error: { status: 400, error: 'No video file uploaded.', code: 'MISSING_FILE' } }
	}

	const trimStartNum = Number(trimStart)
	const trimEndNum = Number(trimEnd)

	if (!Number.isFinite(trimStartNum) || !Number.isFinite(trimEndNum)) {
		return { error: { status: 400, error: 'Invalid trim values.', code: 'INVALID_TRIM_VALUES' } }
	}

	if (trimStartNum < 0 || trimEndNum <= trimStartNum) {
		return { error: { status: 400, error: 'trimEnd must be greater than trimStart.', code: 'INVALID_TRIM_RANGE' } }
	}

	const parsedResizePreset = resolveGifResizePreset(resizePreset)
	if (parsedResizePreset.error) {
		return { error: parsedResizePreset.error }
	}

	const parsedResizeBorderColor = resolveGifResizeBorderColor(resizeBorderColor)
	if (parsedResizeBorderColor.error) {
		return { error: parsedResizeBorderColor.error }
	}

	const parsedTextOverlay = parseGifTextOverlay(textOverlay)
	if (parsedTextOverlay.error) {
		return { error: parsedTextOverlay.error }
	}

	let tmpInput = null
	let tmpOutput = null

	try {
		const duration = trimEndNum - trimStartNum
		const targetSize = GIF_RESIZE_PRESET_DIMENSIONS[parsedResizePreset.preset]
		const ffmpegPadColor = `0x${parsedResizeBorderColor.borderColor.slice(1)}`
		const filterChain = [
			`fps=10,scale=${targetSize.width}:${targetSize.height}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${targetSize.width}:${targetSize.height}:(ow-iw)/2:(oh-ih)/2:color=${ffmpegPadColor}`,
		]

		if (parsedTextOverlay.value) {
			filterChain.push(buildGifDrawtextFilter(parsedTextOverlay.value))
		}

		const filterGraph = `${filterChain.join(',')},split[s0][s1]`

		tmpInput = join(tmpdir(), `input_${Date.now()}.mp4`)
		tmpOutput = join(tmpdir(), `output_${Date.now()}.gif`)

		await writeFile(tmpInput, req.file.buffer)

		await new Promise((resolve, reject) => {
			ffmpeg(tmpInput)
				.setStartTime(trimStartNum)
				.setDuration(duration)
				.complexFilter([
					filterGraph,
					'[s0]palettegen[p]',
					'[s1][p]paletteuse[out]',
				])
				.outputOptions(['-map [out]', '-loop 0'])
				.outputFormat('gif')
				.on('error', (err, stdout, stderr) => {
					console.error('FFmpeg Trim Error:', err.message)
					console.error('FFmpeg stderr:', stderr)
					reject(new Error(stderr || err.message))
				})
				.on('end', resolve)
				.save(tmpOutput)
		})

		const outputBuffer = await readFile(tmpOutput)

		const trimId = await saveMedia({
			buffer: outputBuffer,
			mimeType: 'image/gif',
			fileName: 'output.gif',
			metadata: {
				kind: 'gif',
				operation: 'trim-video',
				resizePreset: parsedResizePreset.preset,
				resizeBorderColor: parsedResizeBorderColor.borderColor,
				textOverlay: parsedTextOverlay.value,
			},
		})

		return {
			status: 200,
			data: {
				id: trimId,
				type: 'gif',
				url: buildMediaUrl(req, trimId),
				mimeType: 'image/gif',
				size: outputBuffer.length,
				resizePreset: parsedResizePreset.preset,
				resizeBorderColor: parsedResizeBorderColor.borderColor,
				textOverlay: parsedTextOverlay.value,
			},
		}
	} catch (error) {
		console.error('FFmpeg Trim Error:', error)
		return { error: { status: 500, error: 'Failed to trim video.', code: 'TRIM_FAILED' } }
	} finally {
		if (tmpInput) {
			await unlink(tmpInput).catch(() => {})
		}
		if (tmpOutput) {
			await unlink(tmpOutput).catch(() => {})
		}
	}
}

export const applyPresetVideoFilter = async (req) => {
	const { preset } = req.body ?? {}

	if (!req.file) {
		return { error: { status: 400, error: 'No video file uploaded.', code: 'MISSING_FILE' } }
	}

	const key = typeof preset === 'string' ? preset.toLowerCase() : ''
	const validPresets = ['noir', 'sepia', 'vivid', 'fade']
	if (!validPresets.includes(key)) {
		return { error: { status: 400, error: 'Invalid or unsupported preset.', code: 'INVALID_PRESET' } }
	}

	const ffmpegFilters = {
		noir: 'hue=s=0,eq=contrast=1.4:brightness=-0.05',
		sepia: 'colorchannelmixer=rr=0.393:rg=0.769:rb=0.189:gr=0.349:gg=0.686:gb=0.168:br=0.272:bg=0.534:bb=0.131',
		vivid: 'eq=saturation=1.4:contrast=1.2:brightness=0.1',
		fade: 'eq=contrast=0.8:brightness=0.1:saturation=0.8',
	}

	const tmpInput = join(tmpdir(), `input_${Date.now()}.mp4`)
	writeFileSync(tmpInput, req.file.buffer)

	try {
		const outputBuffer = await new Promise((resolve, reject) => {
			const chunks = []
			const command = ffmpeg(tmpInput)
				.videoFilters(ffmpegFilters[key])
				.outputFormat('mp4')
				.outputOptions(['-movflags frag_keyframe+empty_moov', '-pix_fmt yuv420p'])

			command.on('error', reject)

			const passthrough = command.pipe()
			passthrough.on('data', (chunk) => chunks.push(chunk))
			passthrough.on('end', () => resolve(Buffer.concat(chunks)))
			passthrough.on('error', reject)
		})

		unlinkSync(tmpInput)

		const filterId = await saveMedia({
			buffer: outputBuffer,
			mimeType: 'video/mp4',
			fileName: `filtered-${key}.mp4`,
			metadata: {
				kind: 'video',
				operation: 'preset-video-filter',
				preset: key,
			},
		})

		return {
			status: 200,
			data: {
				id: filterId,
				type: 'video',
				url: buildMediaUrl(req, filterId),
				mimeType: 'video/mp4',
				size: outputBuffer.length,
				preset: key,
			},
		}
	} catch (error) {
		try { unlinkSync(tmpInput) } catch {}
		console.error('Video Filter Error:', error)
		return { error: { status: 500, error: 'Failed to apply video filter.', code: 'VIDEO_FILTER_FAILED' } }
	}
}

export const exportGifService = async (req) => {
	const { mediaId } = req.body ?? {}

	if (!mediaId) {
		return { error: { status: 400, error: 'Missing mediaId.', code: 'MISSING_MEDIA_ID' } }
	}

	const media = await loadMedia(mediaId)
	if (!media) {
		return { error: { status: 404, error: 'Media not found.', code: 'MEDIA_NOT_FOUND' } }
	}

	return {
		status: 200,
		data: {
			id: mediaId,
			url: buildMediaUrl(req, mediaId),
			downloadUrl: buildExportDownloadUrl(req, mediaId),
		},
	}
}