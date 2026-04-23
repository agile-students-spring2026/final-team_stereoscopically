import { Router } from 'express'

import {
	addTextImageHandler,
	adjustImageHandler,
	applyPresetImageFilterHandler,
	cropImageHandler,
	downloadExportHandler,
	exportImageHandler,
	getMediaHandler,
	healthCheck,
	uploadImageHandler,
	uploadVideoHandler,
	trimVideoHandler,
	applyPresetVideoFilterHandler,
	exportGifHandler,
} from '../controllers/mediaController.js'
import { imageUpload, videoUpload } from '../middleware/uploadMiddleware.js'

const router = Router()

router.get('/health', healthCheck)
router.post('/api/upload/image', imageUpload.single('file'), uploadImageHandler)
router.post('/api/adjust/image', adjustImageHandler)
router.post('/api/filter/image', applyPresetImageFilterHandler)
router.post('/api/crop/image', cropImageHandler)
router.post('/api/export/image', exportImageHandler)
router.post('/api/text/image', addTextImageHandler)
router.get('/api/media/:id', getMediaHandler)
router.get('/api/export/:id/download', downloadExportHandler)
router.post('/api/trim/video', videoUpload.single('video'), trimVideoHandler)
router.post('/api/filter/video', videoUpload.single('video'), applyPresetVideoFilterHandler)
router.post('/api/export/gif', exportGifHandler)
router.post('/api/upload/video', videoUpload.single('video'), uploadVideoHandler)

export default router
