import cors from 'cors'
import express from 'express'
import multer from 'multer'

const app = express()
const port = process.env.PORT || 4000
const MAX_IMAGE_SIZE_BYTES = 50 * 1024 * 1024
const MEDIA_TTL_MS = 10 * 60 * 1000
const inMemoryMediaStore = new Map()

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

