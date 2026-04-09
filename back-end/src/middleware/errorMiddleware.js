import multer from 'multer'

export const notFoundHandler = (_req, res) => {
	return res.status(404).json({
		error: 'Route not found.',
		code: 'ROUTE_NOT_FOUND',
	})
}

export const errorHandler = (error, _req, res, next) => {
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
}
