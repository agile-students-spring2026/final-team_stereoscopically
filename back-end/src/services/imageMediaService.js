import sharp from 'sharp'
import { normalizeTextOverlayRequest, renderTextOverlayBuffer } from './textOverlayService.js'
import { applyImageAdjustments, PRESET_ADJUSTMENTS } from './imageAdjustService.js'
import { buildMediaUrl, buildExportDownloadUrl, loadMedia, saveMedia, parseLetterboxBackground, parseCropParams } from './mediaUtils.js'

const staticImageOnly = (media) => media.mimeType?.startsWith('image/') && media.mimeType !== 'image/gif'

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
			.extract({ left: safeLeft, top: safeTop, width: safeW, height: safeH })
			.png()
			.toBuffer()

		const cropId = await saveMedia({
			buffer: croppedBuffer,
			mimeType: 'image/png',
			fileName: 'cropped.png',
			metadata: { kind: 'image', sourceMediaId: mediaId, operation: 'crop' },
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
		return { error: { status: 400, error: 'Invalid letterbox color. Use "transparent" or a #RRGGBB hex value.', code: 'INVALID_LETTERBOX_COLOR' } }
	}

	if (!mediaId) {
		return { error: { status: 400, error: 'Missing mediaId for export.', code: 'MISSING_MEDIA_ID' } }
	}

	if (!Number.isInteger(targetWidth) || !Number.isInteger(targetHeight) || targetWidth <= 0 || targetHeight <= 0 || targetWidth > 4096 || targetHeight > 4096) {
		return { error: { status: 400, error: 'Invalid export dimensions.', code: 'INVALID_DIMENSIONS' } }
	}

	const media = await loadMedia(mediaId)
	if (!media) {
		return { error: { status: 404, error: 'Media not found.', code: 'MEDIA_NOT_FOUND' } }
	}

	if (!media.mimeType?.startsWith('image/') || media.mimeType === 'image/gif') {
		return { error: { status: 400, error: 'Only static image export is supported.', code: 'UNSUPPORTED_MEDIA_TYPE' } }
	}

	try {
		const resizedBuf = await sharp(media.buffer).rotate().resize(targetWidth, targetHeight, { fit: 'inside', withoutEnlargement: false }).png().toBuffer()
		const { width: resizedW, height: resizedH } = await sharp(resizedBuf).metadata()
		const rw = resizedW ?? targetWidth
		const rh = resizedH ?? targetHeight
		const left = Math.max(0, Math.round((targetWidth - rw) / 2))
		const top = Math.max(0, Math.round((targetHeight - rh) / 2))

		const exportedBuffer = await sharp({ create: { width: targetWidth, height: targetHeight, channels: 4, background } }).composite([{ input: resizedBuf, left, top }]).png().toBuffer()

		const fileName = `sticker-${targetWidth}x${targetHeight}.png`
		const exportId = await saveMedia({ buffer: exportedBuffer, mimeType: 'image/png', fileName, metadata: { kind: 'image', sourceMediaId: mediaId, operation: 'export', width: targetWidth, height: targetHeight, letterboxColor: letterboxColor ?? 'transparent' } })

		return { status: 200, data: { id: exportId, type: 'image', url: buildMediaUrl(req, exportId), downloadUrl: buildExportDownloadUrl(req, exportId), mimeType: 'image/png', width: targetWidth, height: targetHeight, size: exportedBuffer.length, fileName } }
	} catch (error) {
		console.error('Export image error:', error)
		return { error: { status: 500, error: 'Failed to export image.', code: 'EXPORT_FAILED' } }
	}
}

export const adjustImage = async (req) => {
	const { mediaId, brightness, contrast, saturation, hue, grayscale, sepia, sharpness } = req.body ?? {}

	if (!mediaId) {
		return { error: { status: 400, error: 'Missing mediaId.', code: 'MISSING_MEDIA_ID' } }
	}

	const media = await loadMedia(mediaId)
	if (!media) {
		return { error: { status: 404, error: 'Media not found.', code: 'MEDIA_NOT_FOUND' } }
	}

	if (!staticImageOnly(media)) {
		return { error: { status: 400, error: 'Only static images are supported (not GIF).', code: 'UNSUPPORTED_MEDIA_TYPE' } }
	}

	const opts = { brightness: brightness ?? 1, contrast: contrast ?? 1, saturation: saturation ?? 1, hue: hue ?? 0, grayscale: grayscale ?? 0, sepia: sepia ?? 0, sharpness: sharpness ?? 1 }
	const numericKeys = ['brightness', 'contrast', 'saturation', 'hue', 'grayscale', 'sepia', 'sharpness']
	for (const k of numericKeys) {
		const v = opts[k]
		if (typeof v !== 'number' || !Number.isFinite(v)) {
			return { error: { status: 400, error: 'Adjustment values must be finite numbers.', code: 'INVALID_ADJUST_PARAMS' } }
		}
	}

	try {
		const out = await applyImageAdjustments(media.buffer, opts)
		const newId = await saveMedia({ buffer: out, mimeType: 'image/png', fileName: 'adjusted.png', metadata: { kind: 'image', sourceMediaId: mediaId, operation: 'adjust', adjustments: opts } })
		const meta = await sharp(out).metadata()
		return { status: 200, data: { id: newId, type: 'image', url: buildMediaUrl(req, newId), mimeType: 'image/png', size: out.length, width: meta.width, height: meta.height } }
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
		return { error: { status: 400, error: 'Only static images are supported (not GIF).', code: 'UNSUPPORTED_MEDIA_TYPE' } }
	}

	try {
		const out = await applyImageAdjustments(media.buffer, presetOpts)
		const newId = await saveMedia({ buffer: out, mimeType: 'image/png', fileName: `preset-${key}.png`, metadata: { kind: 'image', sourceMediaId: mediaId, operation: 'preset-filter', preset: key } })
		const meta = await sharp(out).metadata()
		return { status: 200, data: { id: newId, type: 'image', url: buildMediaUrl(req, newId), mimeType: 'image/png', size: out.length, width: meta.width, height: meta.height, preset: key } }
	} catch (error) {
		console.error('Preset filter error:', error)
		return { error: { status: 500, error: 'Failed to apply preset filter.', code: 'PRESET_FILTER_FAILED' } }
	}
}

export const addTextToImage = async (req) => {
	const { mediaId, text, x, y, fontFamily, fontSize, color } = req.body ?? {}

	if (!mediaId) {
		return { error: { status: 400, error: 'Missing mediaId.', code: 'MISSING_MEDIA_ID' } }
	}

	const media = await loadMedia(mediaId)
	if (!media) {
		return { error: { status: 404, error: 'Media not found.', code: 'MEDIA_NOT_FOUND' } }
	}

	if (!media.mimeType?.startsWith('image/')) {
		return { error: { status: 400, error: 'Only image text overlay is supported.', code: 'UNSUPPORTED_MEDIA_TYPE' } }
	}

	if (typeof text !== 'string') {
		return { error: { status: 400, error: 'Invalid text payload.', code: 'INVALID_TEXT_PAYLOAD' } }
	}

	if (!text.trim()) {
		return { status: 200, data: { id: mediaId, type: 'image', url: buildMediaUrl(req, mediaId), mimeType: media.mimeType, size: media.size, noOp: true } }
	}

	const parsed = normalizeTextOverlayRequest({ text, x, y, fontFamily, fontSize, color })
	if (parsed.error) {
		return { error: parsed.error }
	}

	try {
		const { buffer: renderedBuffer, width, height } = await renderTextOverlayBuffer({ imageBuffer: media.buffer, ...parsed.value })
		const textId = await saveMedia({ buffer: renderedBuffer, mimeType: 'image/png', fileName: 'text-overlay.png', metadata: { kind: 'image', sourceMediaId: mediaId, operation: 'text-overlay' } })
		return { status: 200, data: { id: textId, type: 'image', url: buildMediaUrl(req, textId), mimeType: 'image/png', size: renderedBuffer.length, width, height, noOp: false } }
	} catch (error) {
		console.error('Text overlay failed:', error)
		return { error: { status: 500, error: 'Failed to render text overlay.', code: 'TEXT_RENDER_FAILED' } }
	}
}

