import multer from 'multer'

import { MAX_UPLOAD_SIZE_BYTES } from '../config/constants.js'

export const imageUpload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
})

export const videoUpload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
})