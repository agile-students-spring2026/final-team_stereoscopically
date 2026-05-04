import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import { existsSync } from 'fs'
import { tmpdir } from 'os'
import { readFile, writeFile, unlink } from 'fs/promises'
import { join } from 'path'
ffmpeg.setFfmpegPath(ffmpegInstaller.path)

import {
	DEFAULT_GIF_RESIZE_BORDER_COLOR,
	DEFAULT_GIF_RESIZE_PRESET,
	GIF_RESIZE_PRESET_DIMENSIONS,
} from '../config/constants.js'
import { buildMediaUrl, buildExportDownloadUrl, saveMedia, loadMedia } from './mediaUtils.js'

const resolveGifResizePreset = (rawPreset) => {
	if (rawPreset == null || rawPreset === '') {
		return { preset: DEFAULT_GIF_RESIZE_PRESET }
	}
	if (typeof rawPreset !== 'string') {
		return { error: { status: 400, error: 'Invalid resize preset.', code: 'INVALID_RESIZE_PRESET' } }
	}
	const preset = rawPreset.toLowerCase().trim()
	if (!GIF_RESIZE_PRESET_DIMENSIONS[preset]) {
		return { error: { status: 400, error: 'Invalid resize preset. Use square, landscape, or portrait.', code: 'INVALID_RESIZE_PRESET' } }
	}
	return { preset }
}

const resolveGifResizeBorderColor = (rawColor) => {
	if (rawColor == null || rawColor === '') {
		return { borderColor: DEFAULT_GIF_RESIZE_BORDER_COLOR }
	}
	if (typeof rawColor !== 'string') {
		return { error: { status: 400, error: 'Invalid resize border color.', code: 'INVALID_RESIZE_BORDER_COLOR' } }
	}
	const color = rawColor.trim()
	if (color.toLowerCase() === 'transparent') {
		return { borderColor: 'transparent' }
	}
	if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
		return { error: { status: 400, error: 'Invalid resize border color. Use a #RRGGBB hex value.', code: 'INVALID_RESIZE_BORDER_COLOR' } }
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
	let parsed = rawTextOverlay
	if (typeof rawTextOverlay === 'string') {
		try {
			parsed = JSON.parse(rawTextOverlay)
		} catch {
			return { error: { status: 400, error: 'Invalid text overlay payload.', code: 'INVALID_TEXT_OVERLAY' } }
		}
	}
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		return { error: { status: 400, error: 'Invalid text overlay payload.', code: 'INVALID_TEXT_OVERLAY' } }
	}
	const rawText = parsed.text
	if (typeof rawText !== 'string') {
		return { error: { status: 400, error: 'Invalid text overlay text value.', code: 'INVALID_TEXT_OVERLAY_TEXT' } }
	}
	if (rawText.length > MAX_GIF_TEXT_LENGTH) {
		return { error: { status: 400, error: `Text overlay is too long (max ${MAX_GIF_TEXT_LENGTH} characters).`, code: 'INVALID_TEXT_OVERLAY_TEXT' } }
	}
	if (!rawText.trim()) {
		return { value: null }
	}
	const rawSize = parsed.size
	const size = rawSize == null ? DEFAULT_GIF_TEXT_SIZE : Number(rawSize)
	if (!Number.isFinite(size) || size < MIN_GIF_TEXT_SIZE || size > MAX_GIF_TEXT_SIZE) {
		return { error: { status: 400, error: `Invalid text overlay size. Must be between ${MIN_GIF_TEXT_SIZE} and ${MAX_GIF_TEXT_SIZE}.`, code: 'INVALID_TEXT_OVERLAY_SIZE' } }
	}
	const rawColor = parsed.color == null ? DEFAULT_GIF_TEXT_COLOR : parsed.color
	if (typeof rawColor !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(rawColor.trim())) {
		return { error: { status: 400, error: 'Invalid text overlay color. Use a #RRGGBB hex value.', code: 'INVALID_TEXT_OVERLAY_COLOR' } }
	}
	const rawX = parsed.position?.x
	const rawY = parsed.position?.y
	const x = rawX == null ? DEFAULT_GIF_TEXT_POSITION.x : Number(rawX)
	const y = rawY == null ? DEFAULT_GIF_TEXT_POSITION.y : Number(rawY)
	if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100) {
		return { error: { status: 400, error: 'Invalid text overlay position.', code: 'INVALID_TEXT_OVERLAY_POSITION' } }
	}
	return { value: { text: rawText, size: Math.round(size), color: rawColor.trim().toLowerCase(), position: { x, y } } }
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

/** macOS Arial is not present in Docker/Linux images; Debian uses packaged DejaVu. */
function resolveGifDrawtextFontFile() {
	const envPath = typeof process.env.GIF_DRAWTEXT_FONT_FILE === 'string'
		? process.env.GIF_DRAWTEXT_FONT_FILE.trim()
		: ''
	const candidates = [
		envPath,
		'/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
		'/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
		'/System/Library/Fonts/Supplemental/Arial.ttf',
	].filter(Boolean)
	for (const p of candidates) {
		if (existsSync(p)) return p
	}
	console.warn(
		'[gifMediaService] No drawtext font file found. GIF text may fail. Set GIF_DRAWTEXT_FONT_FILE or install fonts-dejavu-core.',
	)
	return '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
}

const FONT_FILE = resolveGifDrawtextFontFile()

/** `textOverlay.size` is in pixels on the SOURCE video frame (frontend preview semantics). FFmpeg drawtext fontsize is pixels on the SCALED+PAD output canvas—scale uniformly like `scale=tw:th:force_original_aspect_ratio=decrease`. */
const gifDrawtextFontSizeForScaledCanvas = (userSizePx, inputW, inputH, tw, th) => {
	const iw = Math.max(1, inputW)
	const ih = Math.max(1, inputH)
	const uniform = Math.min(tw / iw, th / ih)
	const scaled = Math.round(userSizePx * uniform)
	return Math.min(288, Math.max(6, scaled))
}

const probeVideoStreamSize = (filePath) =>
	new Promise((resolve, reject) => {
		ffmpeg.ffprobe(filePath, (err, metadata) => {
			if (err) return reject(err)
			const stream = metadata?.streams?.find((s) => s.codec_type === 'video')
			const width = Number(stream?.width)
			const height = Number(stream?.height)
			if (!Number.isFinite(width) || width < 1 || !Number.isFinite(height) || height < 1) {
				return reject(new Error('Could not read video dimensions for text sizing.'))
			}
			resolve({ width, height })
		})
	})

const buildGifDrawtextFilter = (textOverlay, fontSizePx) => {
	const xRatio = textOverlay.position.x / 100
	const yRatio = textOverlay.position.y / 100
	const fontColor = `0x${textOverlay.color.slice(1)}`
	const escapedText = escapeGifDrawtextValue(textOverlay.text)
	const fs = Number.isFinite(fontSizePx) ? Math.round(fontSizePx) : textOverlay.size
	return `drawtext=fontfile='${FONT_FILE}':text='${escapedText}':fontsize=${fs}:fontcolor=${fontColor}:x=(w*${xRatio.toFixed(6)})-(text_w/2):y=(h*${yRatio.toFixed(6)})-(text_h/2)`
}

export const uploadVideo = async (req) => {
	if (!req.file) {
		return { error: { status: 400, error: 'No video file uploaded.', code: 'MISSING_FILE' } }
	}

	if (!req.file.mimetype?.startsWith('video/')) {
		return { error: { status: 400, error: 'Unsupported file type. Please upload a video.', code: 'INVALID_TYPE' } }
	}

	let tmpInput = null
	let tmpPoster = null

	try {
		const mediaId = await saveMedia({
			buffer: req.file.buffer,
			mimeType: req.file.mimetype,
			fileName: req.file.originalname || 'upload.mp4',
			metadata: { kind: 'video', operation: 'upload' },
		})

		let posterId = null
		try {
			tmpInput = join(tmpdir(), `upload_poster_src_${Date.now()}.mp4`)
			tmpPoster = join(tmpdir(), `upload_poster_${Date.now()}.jpg`)
			await writeFile(tmpInput, req.file.buffer)
			await new Promise((resolve, reject) => {
				ffmpeg(tmpInput)
					.inputOptions(['-ss', '0.1'])
					.outputOptions(['-vframes', '1', '-q:v', '4'])
					.on('error', reject)
					.on('end', resolve)
					.save(tmpPoster)
			})
			const posterBuffer = await readFile(tmpPoster)
			posterId = await saveMedia({
				buffer: posterBuffer,
				mimeType: 'image/jpeg',
				fileName: 'video-poster.jpg',
				metadata: { kind: 'image', operation: 'video-poster-frame' },
			})
		} catch (posterErr) {
			console.warn(
				'[uploadVideo] Poster extraction failed (draft list may use video preview only):',
				posterErr?.message || posterErr,
			)
		}

		const data = {
			id: mediaId,
			type: 'video',
			url: buildMediaUrl(req, mediaId),
			mimeType: req.file.mimetype,
			size: req.file.size,
		}
		if (posterId) {
			data.posterId = posterId
			data.posterUrl = buildMediaUrl(req, posterId)
		}

		return { status: 200, data }
	} catch (error) {
		console.error('Upload video error:', error)
		return { error: { status: 500, error: 'Failed to upload video.', code: 'UPLOAD_FAILED' } }
	} finally {
		if (tmpInput) await unlink(tmpInput).catch(() => {})
		if (tmpPoster) await unlink(tmpPoster).catch(() => {})
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
		const { width: tw, height: th } = targetSize
		const scalePadStep =
			parsedResizeBorderColor.borderColor === 'transparent'
				? `fps=10,scale=${tw}:${th}:force_original_aspect_ratio=decrease:flags=lanczos,format=rgba,pad=${tw}:${th}:(ow-iw)/2:(oh-ih)/2:color=#00000000`
				: `fps=10,scale=${tw}:${th}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${tw}:${th}:(ow-iw)/2:(oh-ih)/2:color=0x${parsedResizeBorderColor.borderColor.slice(1)}`

		tmpInput = join(tmpdir(), `input_${Date.now()}.mp4`)
		tmpOutput = join(tmpdir(), `output_${Date.now()}.gif`)

		await writeFile(tmpInput, req.file.buffer)

		let inputDims = null
		if (parsedTextOverlay.value) {
			try {
				inputDims = await probeVideoStreamSize(tmpInput)
			} catch (probeErr) {
				console.error('GIF trim: ffprobe dimensions failed:', probeErr)
				return {
					error: {
						status: 500,
						error: 'Could not read video dimensions for text overlay. Try re-encoding the video.',
						code: 'VIDEO_PROBE_FAILED',
					},
				}
			}
		}

		const filterChain = [scalePadStep]
		if (parsedTextOverlay.value && inputDims) {
			const drawFontSize = gifDrawtextFontSizeForScaledCanvas(
				parsedTextOverlay.value.size,
				inputDims.width,
				inputDims.height,
				tw,
				th,
			)
			filterChain.push(buildGifDrawtextFilter(parsedTextOverlay.value, drawFontSize))
		}
		const filterGraph = `${filterChain.join(',')},split[s0][s1]`

		await new Promise((resolve, reject) => {
			ffmpeg(tmpInput)
				.setStartTime(trimStartNum)
				.setDuration(duration)
				.complexFilter([filterGraph, '[s0]palettegen[p]', '[s1][p]paletteuse[out]'])
				.outputOptions(['-map [out]', '-loop 0'])
				.outputFormat('gif')
				.on('error', (err, _stdout, stderr) => {
					console.error('FFmpeg Trim Error:', err.message)
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
		if (tmpInput) await unlink(tmpInput).catch(() => {})
		if (tmpOutput) await unlink(tmpOutput).catch(() => {})
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
	await writeFile(tmpInput, req.file.buffer)

	try {
		const outputBuffer = await new Promise((resolve, reject) => {
			const chunks = []
			const command = ffmpeg(tmpInput).videoFilters(ffmpegFilters[key]).outputFormat('mp4').outputOptions(['-movflags frag_keyframe+empty_moov', '-pix_fmt yuv420p'])
			command.on('error', reject)
			const passthrough = command.pipe()
			passthrough.on('data', (chunk) => chunks.push(chunk))
			passthrough.on('end', () => resolve(Buffer.concat(chunks)))
			passthrough.on('error', reject)
		})

		const filterId = await saveMedia({ buffer: outputBuffer, mimeType: 'video/mp4', fileName: `filtered-${key}.mp4`, metadata: { kind: 'video', operation: 'preset-video-filter', preset: key } })

		return { status: 200, data: { id: filterId, type: 'video', url: buildMediaUrl(req, filterId), mimeType: 'video/mp4', size: outputBuffer.length, preset: key } }
	} catch (error) {
		console.error('Video Filter Error:', error)
		return { error: { status: 500, error: 'Failed to apply video filter.', code: 'VIDEO_FILTER_FAILED' } }
	} finally {
		await unlink(tmpInput).catch(() => {})
	}
}

const clampGifPlaybackRate = (raw) => {
	const n = Number(raw)
	if (!Number.isFinite(n) || n <= 0) return 1
	return Math.min(4, Math.max(0.25, n))
}

export const exportGifService = async (req) => {
	const { mediaId, playbackRate: rawPlayback } = req.body ?? {}

	if (!mediaId) {
		return { error: { status: 400, error: 'Missing mediaId.', code: 'MISSING_MEDIA_ID' } }
	}

	const media = await loadMedia(mediaId)
	if (!media) {
		return { error: { status: 404, error: 'Media not found.', code: 'MEDIA_NOT_FOUND' } }
	}

	const playbackRate = clampGifPlaybackRate(rawPlayback ?? 1)
	const mime = (media.mimeType || '').toLowerCase()
	const isGif = mime.includes('gif')

	if (!isGif || Math.abs(playbackRate - 1) < 1e-6) {
		return {
			status: 200,
			data: {
				id: mediaId,
				url: buildMediaUrl(req, mediaId),
				downloadUrl: buildExportDownloadUrl(req, mediaId),
			},
		}
	}

	const ptsFactor = 1 / playbackRate
	let tmpIn = null
	let tmpOut = null

	try {
		tmpIn = join(tmpdir(), `export_gif_in_${Date.now()}.gif`)
		tmpOut = join(tmpdir(), `export_gif_out_${Date.now()}.gif`)
		await writeFile(tmpIn, media.buffer)

		const setptsExpr = `PTS*${ptsFactor.toFixed(6)}`
		const filterGraph = `[0:v]setpts=${setptsExpr},split[s0][s1]`

		await new Promise((resolve, reject) => {
			ffmpeg(tmpIn)
				.complexFilter([filterGraph, '[s0]palettegen=reserve_transparent=on[p]', '[s1][p]paletteuse[out]'])
				.outputOptions(['-map [out]', '-loop 0'])
				.outputFormat('gif')
				.on('error', (err, _stdout, stderr) => {
					console.error('[exportGifService] ffmpeg:', err?.message, stderr)
					reject(err)
				})
				.on('end', resolve)
				.save(tmpOut)
		})

		const outputBuffer = await readFile(tmpOut)
		const newId = await saveMedia({
			buffer: outputBuffer,
			mimeType: 'image/gif',
			fileName: 'export-speed.gif',
			metadata: { kind: 'gif', operation: 'export-gif-speed', playbackRate },
		})

		return {
			status: 200,
			data: {
				id: newId,
				url: buildMediaUrl(req, newId),
				downloadUrl: buildExportDownloadUrl(req, newId),
			},
		}
	} catch (error) {
		console.error('exportGifService error:', error)
		return { error: { status: 500, error: 'Failed to export GIF at selected speed.', code: 'GIF_EXPORT_FAILED' } }
	} finally {
		if (tmpIn) await unlink(tmpIn).catch(() => {})
		if (tmpOut) await unlink(tmpOut).catch(() => {})
	}
}
