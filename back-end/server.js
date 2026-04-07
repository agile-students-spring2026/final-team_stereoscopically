import cors from 'cors'
import express from 'express'
import multer from 'multer'
import sharp from 'sharp'

const app = express()
const port = process.env.PORT || 4000
const MAX_IMAGE_SIZE_BYTES = 50 * 1024 * 1024
const MAX_EXPORT_DIMENSION = 4096
const MEDIA_TTL_MS = 10 * 60 * 1000
const inMemoryMediaStore = new Map()

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
	// Sharp expects alpha in 0–1 for resize background
	return { r, g, b, alpha: 1 }
}

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
})

app.use(cors())
app.use(express.json())

const purgeExpiredMedia = () => {
	const now = Date.now()
	for (const [id, media] of inMemoryMediaStore.entries()) {
		if (media.expiresAt <= now) {
			inMemoryMediaStore.delete(id)
		}
	}
}

setInterval(purgeExpiredMedia, 60 * 1000).unref()

app.get('/health', (_req, res) => {
	res.json({ status: 'ok' })
})

app.post('/api/upload/image', upload.single('file'), (req, res) => {
	if (!req.file) {
		return res.status(400).json({
			error: 'No image file uploaded.',
			code: 'MISSING_FILE',
		})
	}

	if (!req.file.mimetype?.startsWith('image/')) {
		return res.status(400).json({
			error: 'Unsupported file type. Please upload an image.',
			code: 'INVALID_TYPE',
		})
	}

	const mediaId = `img_${Date.now()}_${Math.round(Math.random() * 1e9)}`
	inMemoryMediaStore.set(mediaId, {
		buffer: req.file.buffer,
		mimeType: req.file.mimetype,
		size: req.file.size,
		expiresAt: Date.now() + MEDIA_TTL_MS,
	})

	return res.status(200).json({
		id: mediaId,
		type: 'image',
		url: `${req.protocol}://${req.get('host')}/api/media/${mediaId}`,
		mimeType: req.file.mimetype,
		size: req.file.size,
	})
})

app.post('/api/export/image', async (req, res) => {
	const { mediaId, width, height, letterboxColor } = req.body ?? {}
	const targetWidth = Number(width)
	const targetHeight = Number(height)
	const background = parseLetterboxBackground(letterboxColor)
	if (background === null) {
		return res.status(400).json({
			error: 'Invalid letterbox color. Use "transparent" or a #RRGGBB hex value.',
			code: 'INVALID_LETTERBOX_COLOR',
		})
	}

	if (!mediaId) {
		return res.status(400).json({
			error: 'Missing mediaId for export.',
			code: 'MISSING_MEDIA_ID',
		})
	}

	if (
		!Number.isInteger(targetWidth) ||
		!Number.isInteger(targetHeight) ||
		targetWidth <= 0 ||
		targetHeight <= 0 ||
		targetWidth > MAX_EXPORT_DIMENSION ||
		targetHeight > MAX_EXPORT_DIMENSION
	) {
		return res.status(400).json({
			error: 'Invalid export dimensions.',
			code: 'INVALID_DIMENSIONS',
		})
	}

	const media = inMemoryMediaStore.get(mediaId)
	if (!media || media.expiresAt <= Date.now()) {
		if (media) inMemoryMediaStore.delete(mediaId)
		return res.status(404).json({
			error: 'Media not found or expired.',
			code: 'MEDIA_NOT_FOUND',
		})
	}

	if (!media.mimeType?.startsWith('image/') || media.mimeType === 'image/gif') {
		return res.status(400).json({
			error: 'Only static image export is supported.',
			code: 'UNSUPPORTED_MEDIA_TYPE',
		})
	}

	try {
		// Scale to fit inside the preset (no crop), then composite onto a full-size canvas so letterbox color is always applied.
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

		const exportId = `exp_${Date.now()}_${Math.round(Math.random() * 1e9)}`
		const fileName = `sticker-${targetWidth}x${targetHeight}.png`

		inMemoryMediaStore.set(exportId, {
			buffer: exportedBuffer,
			mimeType: 'image/png',
			size: exportedBuffer.length,
			expiresAt: Date.now() + MEDIA_TTL_MS,
			fileName,
		})

		return res.status(200).json({
			id: exportId,
			type: 'image',
			url: `${req.protocol}://${req.get('host')}/api/media/${exportId}`,
			downloadUrl: `${req.protocol}://${req.get('host')}/api/export/${exportId}/download`,
			mimeType: 'image/png',
			width: targetWidth,
			height: targetHeight,
			size: exportedBuffer.length,
			fileName,
		})
	} catch {
		return res.status(500).json({
			error: 'Failed to export image.',
			code: 'EXPORT_FAILED',
		})
	}
})

app.get('/api/media/:id', (req, res) => {
	const media = inMemoryMediaStore.get(req.params.id)

	if (!media) {
		return res.status(404).json({
			error: 'Media not found or expired.',
			code: 'MEDIA_NOT_FOUND',
		})
	}

	if (media.expiresAt <= Date.now()) {
		inMemoryMediaStore.delete(req.params.id)
		return res.status(404).json({
			error: 'Media not found or expired.',
			code: 'MEDIA_NOT_FOUND',
		})
	}

	res.setHeader('Content-Type', media.mimeType)
	res.setHeader('Cache-Control', 'no-store')
	return res.status(200).send(media.buffer)
})

app.get('/api/export/:id/download', (req, res) => {
	const media = inMemoryMediaStore.get(req.params.id)

	if (!media) {
		return res.status(404).json({
			error: 'Media not found or expired.',
			code: 'MEDIA_NOT_FOUND',
		})
	}

	if (media.expiresAt <= Date.now()) {
		inMemoryMediaStore.delete(req.params.id)
		return res.status(404).json({
			error: 'Media not found or expired.',
			code: 'MEDIA_NOT_FOUND',
		})
	}

	res.setHeader('Content-Type', media.mimeType)
	res.setHeader('Cache-Control', 'no-store')
	res.setHeader('Content-Disposition', `attachment; filename="${media.fileName || 'sticker.png'}"`)
	return res.status(200).send(media.buffer)
})

app.use((error, _req, res, next) => {
	if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
		return res.status(400).json({
			error: 'File is too large (max 50 MB).',
			code: 'MAX_SIZE_EXCEEDED',
		})
	}

	if (error) {
		return res.status(500).json({
			error: 'Unexpected server error while handling image upload.',
			code: 'UPLOAD_FAILED',
		})
	}

	return next()
})

app.listen(port, () => {
	console.log(`[backend] server running on http://localhost:${port}`)
})

