import { Router } from 'express'

import {
	addTextImageHandler,
	cropImageHandler,
	downloadExportHandler,
	exportImageHandler,
	getMediaHandler,
	healthCheck,
	uploadImageHandler,
} from '../controllers/mediaController.js'
import { imageUpload } from '../middleware/uploadMiddleware.js'

const router = Router()

router.get('/health', healthCheck)
router.post('/api/upload/image', imageUpload.single('file'), uploadImageHandler)
router.post('/api/crop/image', cropImageHandler)
router.post('/api/export/image', exportImageHandler)
router.post('/api/text/image', addTextImageHandler)
router.get('/api/media/:id', getMediaHandler)
router.get('/api/export/:id/download', downloadExportHandler)

export default router
