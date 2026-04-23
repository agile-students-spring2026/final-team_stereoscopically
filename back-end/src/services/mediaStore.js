import { ObjectId } from 'mongodb'
import { getMediaBucket } from '../config/database.js'

export const createMedia = async ({ buffer, filename, mimeType, metadata = {} }) => {
	const bucket = getMediaBucket()

	return await new Promise((resolve, reject) => {
		const uploadStream = bucket.openUploadStream(filename, {
			contentType: mimeType,
			metadata: {
				...metadata,
				mimeType,
			},
		})

		uploadStream.end(buffer)

		uploadStream.on('finish', () => {
			resolve({
				id: uploadStream.id.toString(),
				fileName: filename,
				mimeType,
			})
		})

		uploadStream.on('error', reject)
	})
}

export const getMediaFileInfo = async (id) => {
	if (!ObjectId.isValid(id)) {
		return null
	}

	const bucket = getMediaBucket()
	const files = await bucket.find({ _id: new ObjectId(id) }).toArray()
	return files[0] || null
}

export const openMediaDownloadStream = (id) => {
	if (!ObjectId.isValid(id)) {
		throw new Error('Invalid media id.')
	}

	const bucket = getMediaBucket()
	return bucket.openDownloadStream(new ObjectId(id))
}

export const deleteMedia = async (id) => {
	if (!ObjectId.isValid(id)) {
		return
	}

	const bucket = getMediaBucket()
	await bucket.delete(new ObjectId(id))
}