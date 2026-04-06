import cors from 'cors'
import express from 'express'
import multer from 'multer'

const app = express()
const port = process.env.PORT || 4000
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
})

app.use(cors())
app.use(express.json())

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

	return res.status(200).json({
		id: `img_${Date.now()}`,
		type: 'image',
		url: `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
		mimeType: req.file.mimetype,
		size: req.file.size,
	})
})

app.use((error, _req, res, next) => {
	if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
		return res.status(400).json({
			error: 'File is too large (max 10 MB).',
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

