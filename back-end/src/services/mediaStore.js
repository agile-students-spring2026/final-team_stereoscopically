import { ObjectId } from 'mongodb'
import { getMediaBucket } from '../config/database.js'
import { Readable, PassThrough } from 'stream'

// In-memory fallback store used when the GridFS bucket isn't initialized.
// This is intentionally lightweight for tests and local development.
const memoryStore = new Map()

const isValidObjectIdString = (id) => typeof id === 'string' && ObjectId.isValid(id)

export const createMedia = async ({ buffer, filename, mimeType, metadata = {} } = {}) => {
	if (!buffer || !filename || !mimeType) {
		throw new Error('Missing required media fields: buffer, filename, mimeType')
	}

	// Try to use GridFS bucket; fall back to in-memory store when unavailable.
	try {
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
				resolve({ id: uploadStream.id.toString(), fileName: filename, mimeType })
			})

			uploadStream.on('error', reject)
		})
	} catch (err) {
		// Fallback: store in memory and return a generated ObjectId-like id
		const id = new ObjectId().toString()
		const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
		memoryStore.set(id, {
			buffer: buf,
			filename,
			mimeType,
			metadata: { ...metadata, mimeType },
			length: buf.length,
		})
		return { id, fileName: filename, mimeType }
	}
}

export const getMediaFileInfo = async (id) => {
	if (!isValidObjectIdString(id)) return null

	try {
		const bucket = getMediaBucket()
		const files = await bucket.find({ _id: new ObjectId(id) }).toArray()
		return files[0] || null
	} catch (err) {
		return memoryStore.get(id) || null
	}
}

export const openMediaDownloadStream = (id) => {
	if (!isValidObjectIdString(id)) {
		throw new Error('Invalid media id.')
	}

	try {
		const bucket = getMediaBucket()
		return bucket.openDownloadStream(new ObjectId(id))
	} catch (err) {
		const entry = memoryStore.get(id)
		if (!entry) throw new Error('Invalid media id.')

		// Return a readable stream that emits the buffer then ends.
		const stream = new PassThrough()
		stream.end(entry.buffer)
		return stream
	}
}

export const deleteMedia = async (id) => {
	if (!isValidObjectIdString(id)) return

	try {
		const bucket = getMediaBucket()
		await bucket.delete(new ObjectId(id))
	} catch (err) {
		memoryStore.delete(id)
	}
}