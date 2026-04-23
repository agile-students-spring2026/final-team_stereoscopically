import {
	addTextToImage,
	adjustImage,
	applyPresetImageFilter,
	cropImage,
	exportImage,
	getExportDownloadContent,
	getMediaContent,
	uploadImage,
	uploadVideo,
	trimVideo,
	applyPresetVideoFilter,
	exportGifService,
} from '../services/mediaService.js'
import mongoose from 'mongoose'

const sendResult = (res, result) => {
	if (result.error) {
		return res.status(result.error.status).json({
			error: result.error.error,
			code: result.error.code,
		})
	}

	return res.status(result.status).json(result.data)
}

export const healthCheck = (_req, res) => {
	const dbConnected = mongoose.connection.readyState === 1
	return res.json({
		status: 'ok',
		database: dbConnected ? 'connected' : 'disconnected',
	})
}

export const uploadImageHandler = async (req, res) => {

	const result = await uploadImage(req)
	return sendResult(res, result)

}

export const adjustImageHandler = async (req, res) => {
	const result = await adjustImage(req)
	return sendResult(res, result)
}

export const applyPresetImageFilterHandler = async (req, res) => {
	const result = await applyPresetImageFilter(req)
	return sendResult(res, result)
}

export const cropImageHandler = async (req, res) => {
	const result = await cropImage(req)
	return sendResult(res, result)
}

export const exportImageHandler = async (req, res) => {
	const result = await exportImage(req)
	return sendResult(res, result)
}

export const addTextImageHandler = async (req, res) => {
	const result = await addTextToImage(req)
	return sendResult(res, result)
}

export const getMediaHandler = async (req, res) => {

	const result = await getMediaContent(req.params.id)
	if (result.error) {
		return res.status(result.error.status).json({
			error: result.error.error,
			code: result.error.code,
		})
	}
	for (const [header, value] of Object.entries(result.headers ?? {})) {
		res.setHeader(header, value)
	}
	return res.status(result.status).send(result.data)

}

export const downloadExportHandler = async (req, res) => {
	const result = await getExportDownloadContent(req.params.id)
	if (result.error) {
		return res.status(result.error.status).json({
			error: result.error.error,
			code: result.error.code,
		})
	}

	for (const [header, value] of Object.entries(result.headers ?? {})) {
		res.setHeader(header, value)
	}

	return res.status(result.status).send(result.data)
}

export const uploadVideoHandler = async (req, res) => {
	const result = await uploadVideo(req)
	return sendResult(res, result)
}

export const trimVideoHandler = async (req, res) => {
    const result = await trimVideo(req)
    return sendResult(res, result)
}

export const applyPresetVideoFilterHandler = async (req, res) => {
    const result = await applyPresetVideoFilter(req)
    return sendResult(res, result)
}

export const exportGifHandler = async (req, res, next) => {
	try {
		const result = await exportGifService(req)
		return sendResult(res, result)
	} catch (err) {
		next(err)
	}
}