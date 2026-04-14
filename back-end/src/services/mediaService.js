import sharp from 'sharp'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import { Readable } from 'stream'
import os from 'os'
import fs from 'fs'
import path from 'path'
ffmpeg.setFfmpegPath(ffmpegInstaller.path)
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { MAX_EXPORT_DIMENSION } from '../config/constants.js'
import { createMedia, getActiveMediaOrDeleteExpired } from './mediaStore.js'
import { applyImageAdjustments, PRESET_ADJUSTMENTS } from './imageAdjustService.js'
import { normalizeTextOverlayRequest, renderTextOverlayBuffer } from './textOverlayService.js'

const createMediaId = (prefix = 'img') => `${prefix}_${Date.now()}_${Math.round(Math.random() * 1e9)}`

const buildMediaUrl = (req, id) => `${req.protocol}://${req.get('host')}/api/media/${id}`
const buildExportDownloadUrl = (req, id) => `${req.protocol}://${req.get('host')}/api/export/${id}/download`

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

export const uploadImage = (req) => {
	if (!req.file) {
		return { error: { status: 400, error: 'No image file uploaded.', code: 'MISSING_FILE' } }
	}

	if (!req.file.mimetype?.startsWith('image/')) {
		return {
			error: { status: 400, error: 'Unsupported file type. Please upload an image.', code: 'INVALID_TYPE' },
		}
	}

	const mediaId = createMediaId('img')
	createMedia(mediaId, {
		buffer: req.file.buffer,
		mimeType: req.file.mimetype,
		size: req.file.size,
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
}

export const cropImage = async (req) => {
	const { mediaId, x, y, width, height, unit = 'pixel', scaleX = 1, scaleY = 1 } = req.body ?? {}

	if (!mediaId) {
		return { error: { status: 400, error: 'Missing mediaId.', code: 'MISSING_MEDIA_ID' } }
	}

	const media = getActiveMediaOrDeleteExpired(mediaId)
	if (!media) {
		return { error: { status: 404, error: 'Media not found or expired.', code: 'MEDIA_NOT_FOUND' } }
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

		const cropId = createMediaId('img')
		createMedia(cropId, {
			buffer: croppedBuffer,
			mimeType: 'image/png',
			size: croppedBuffer.length,
			fileName: 'cropped.png',
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

	const media = getActiveMediaOrDeleteExpired(mediaId)
	if (!media) {
		return { error: { status: 404, error: 'Media not found or expired.', code: 'MEDIA_NOT_FOUND' } }
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

		const exportId = createMediaId('exp')
		const fileName = `sticker-${targetWidth}x${targetHeight}.png`

		createMedia(exportId, {
			buffer: exportedBuffer,
			mimeType: 'image/png',
			size: exportedBuffer.length,
			fileName,
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
	} catch {
		return { error: { status: 500, error: 'Failed to export image.', code: 'EXPORT_FAILED' } }
	}
}

const staticImageOnly = (media) =>
	media.mimeType?.startsWith('image/') && media.mimeType !== 'image/gif'

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

	const media = getActiveMediaOrDeleteExpired(mediaId)
	if (!media) {
		return { error: { status: 404, error: 'Media not found or expired.', code: 'MEDIA_NOT_FOUND' } }
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
		const newId = createMediaId('img')
		createMedia(newId, {
			buffer: out,
			mimeType: 'image/png',
			size: out.length,
			fileName: 'adjusted.png',
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

	const media = getActiveMediaOrDeleteExpired(mediaId)
	if (!media) {
		return { error: { status: 404, error: 'Media not found or expired.', code: 'MEDIA_NOT_FOUND' } }
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
		const newId = createMediaId('img')
		createMedia(newId, {
			buffer: out,
			mimeType: 'image/png',
			size: out.length,
			fileName: `preset-${key}.png`,
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

	const media = getActiveMediaOrDeleteExpired(mediaId)
	if (!media) {
		return { error: { status: 404, error: 'Media not found or expired.', code: 'MEDIA_NOT_FOUND' } }
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

		const textId = createMediaId('img')
		createMedia(textId, {
			buffer: renderedBuffer,
			mimeType: 'image/png',
			size: renderedBuffer.length,
			fileName: 'text-overlay.png',
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

export const getMediaContent = (id) => {
	const media = getActiveMediaOrDeleteExpired(id)
	if (!media) {
		return { error: { status: 404, error: 'Media not found or expired.', code: 'MEDIA_NOT_FOUND' } }
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

export const getExportDownloadContent = (id) => {
	const media = getActiveMediaOrDeleteExpired(id)
	if (!media) {
		return { error: { status: 404, error: 'Media not found or expired.', code: 'MEDIA_NOT_FOUND' } }
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
    const { trimStart, trimEnd } = req.body ?? {}

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

    try {
        const duration = trimEndNum - trimStartNum

        const tmpInput = path.join(os.tmpdir(), `input_${Date.now()}.mp4`)
        const tmpOutput = path.join(os.tmpdir(), `output_${Date.now()}.gif`)

        await fs.promises.writeFile(tmpInput, req.file.buffer)

        await new Promise((resolve, reject) => {
            ffmpeg(tmpInput)
                .setStartTime(trimStartNum)
                .setDuration(duration)
                .complexFilter([
                    'fps=10,scale=320:-1:flags=lanczos,split[s0][s1]',
                    '[s0]palettegen[p]',
                    '[s1][p]paletteuse[out]',
                ])
                .outputOptions(['-map [out]', '-loop 0'])
                .outputFormat('gif')
                .on('error', (err) => reject(err))
                .on('end', resolve)
                .save(tmpOutput)
        })

        const outputBuffer = await fs.promises.readFile(tmpOutput)

        await fs.promises.unlink(tmpInput).catch(() => {})
        await fs.promises.unlink(tmpOutput).catch(() => {})

        const trimId = createMediaId('gif')
        createMedia(trimId, {
            buffer: outputBuffer,
            mimeType: 'image/gif',
            size: outputBuffer.length,
            fileName: 'output.gif',
        })

        return {
            status: 200,
            data: {
                id: trimId,
                type: 'gif',
                url: buildMediaUrl(req, trimId),
                mimeType: 'image/gif',
                size: outputBuffer.length,
            },
        }
    } catch (error) {
        console.error('FFmpeg Trim Error:', error)
        return { error: { status: 500, error: 'Failed to trim video.', code: 'TRIM_FAILED' } }
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
        sepia: 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131',
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
                .outputOptions(['-movflags frag_keyframe+empty_moov'])

            command.on('error', reject)

            const passthrough = command.pipe()
            passthrough.on('data', (chunk) => chunks.push(chunk))
            passthrough.on('end', () => resolve(Buffer.concat(chunks)))
            passthrough.on('error', reject)
        })

        unlinkSync(tmpInput)

        const filterId = createMediaId('vid')
        createMedia(filterId, {
            buffer: outputBuffer,
            mimeType: 'video/mp4',
            size: outputBuffer.length,
            fileName: `filtered-${key}.mp4`,
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

export const exportGifService = (req) => {
  const { mediaId } = req.body ?? {}

  if (!mediaId) {
    return { error: { status: 400, error: 'Missing mediaId.', code: 'MISSING_MEDIA_ID' } }
  }

  const media = getActiveMediaOrDeleteExpired(mediaId)
  if (!media) {
    return { error: { status: 404, error: 'Media not found or expired.', code: 'MEDIA_NOT_FOUND' } }
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