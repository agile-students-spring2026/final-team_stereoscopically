import { Creation } from '../models/creationModel.js'
import { deleteMedia } from '../services/mediaStore.js'
import { guestCanAccessCreation, userOwnsCreation } from './creationAccess.js'

const MAX_TITLE_LENGTH = 200

const collectPayloadMediaIds = ({ editorPayload = {}, exportAssetId = null } = {}) => {
	const ids = [
		editorPayload?.sourceMediaId,
		editorPayload?.workingMediaId,
		editorPayload?.backendMediaId,
		editorPayload?.preEditWorkingMediaId,
		editorPayload?.preTextWorkingMediaId,
		exportAssetId,
	]

	return [...new Set(ids.filter(Boolean))]
}

const guestOwnerKeyFromRequest = (req) =>
	typeof req.query?.ownerKey === 'string' ? req.query.ownerKey.trim() : ''

const resOf = (status, error, code) => ({ status, body: { error, code } })

const assertCreationAccess = (creation, req) => {
	if (!creation) return { ok: false, response: resOf(404, 'Creation not found.', 'NOT_FOUND') }
	if (req.authUserDoc) {
		return userOwnsCreation(creation, req.authUserDoc)
			? { ok: true }
			: { ok: false, response: resOf(403, 'Not allowed for this draft.', 'FORBIDDEN') }
	}
	const key = guestOwnerKeyFromRequest(req)
	if (!key) {
		return { ok: false, response: resOf(403, 'ownerKey query required.', 'OWNER_KEY_REQUIRED') }
	}
	return guestCanAccessCreation(creation, key)
		? { ok: true }
		: { ok: false, response: resOf(403, 'Not allowed for this draft.', 'FORBIDDEN') }
}

export const createCreation = async (req, res) => {
	const { ownerKey, title, editorPayload, status, exportAssetId: rawExportId } = req.body

	if (!title || typeof title !== 'string' || !title.trim()) {
		return res.status(400).json({ error: 'Missing or invalid title.', code: 'INVALID_TITLE' })
	}

	if (title.length > MAX_TITLE_LENGTH) {
		return res
			.status(400)
			.json({ error: `Title too long. Max ${MAX_TITLE_LENGTH} characters.`, code: 'TITLE_TOO_LONG' })
	}

	if (!editorPayload || typeof editorPayload !== 'object') {
		return res.status(400).json({ error: 'Missing or invalid editorPayload.', code: 'INVALID_PAYLOAD' })
	}

	const exportAssetId =
		typeof rawExportId === 'string' && rawExportId.trim() ? rawExportId.trim() : null

	let trimmedOwnerKey
	if (req.authUserDoc) {
		if (
			ownerKey !== undefined &&
			ownerKey !== null &&
			(typeof ownerKey !== 'string' || ownerKey.trim())
		) {
			return res
				.status(400)
				.json({ error: 'Signed-in clients must not send ownerKey.', code: 'INVALID_OWNER_KEY' })
		}
	} else {
		if (!ownerKey || typeof ownerKey !== 'string' || !ownerKey.trim()) {
			return res.status(400).json({ error: 'Missing or invalid ownerKey.', code: 'INVALID_OWNER_KEY' })
		}
		trimmedOwnerKey = ownerKey.trim()
	}

	try {
		const trackedMediaIds = collectPayloadMediaIds({ editorPayload, exportAssetId })

		const payload = req.authUserDoc
			? {
					userId: req.authUserDoc._id,
					title: title.trim(),
					editorPayload,
					status: status || 'draft',
					exportAssetId,
					trackedMediaIds,
				}
			: {
					ownerKey: trimmedOwnerKey,
					title: title.trim(),
					editorPayload,
					status: status || 'draft',
					exportAssetId,
					trackedMediaIds,
				}

		const creation = await Creation.create(payload)

		return res.status(201).json(creation)
	} catch (error) {
		console.error('createCreation error:', error)
		return res.status(500).json({ error: 'Failed to save creation.', code: 'CREATE_FAILED' })
	}
}

export const getCreations = async (req, res) => {
	try {
		if (req.authUserDoc) {
			const creations = await Creation.find({ userId: req.authUserDoc._id }).sort({
				updatedAt: -1,
			})
			return res.status(200).json(creations)
		}

		const { ownerKey } = req.query
		if (!ownerKey || typeof ownerKey !== 'string' || !ownerKey.trim()) {
			return res.status(400).json({ error: 'Missing or invalid ownerKey.', code: 'INVALID_OWNER_KEY' })
		}

		const creations = await Creation.find({
			ownerKey: ownerKey.trim(),
			$or: [{ userId: null }, { userId: { $exists: false } }],
		}).sort({ updatedAt: -1 })
		return res.status(200).json(creations)
	} catch (error) {
		console.error('getCreations error:', error)
		return res.status(500).json({ error: 'Failed to fetch creations.', code: 'FETCH_FAILED' })
	}
}

export const getCreationById = async (req, res) => {
	const { id } = req.params

	try {
		const creation = await Creation.findById(id)
		const gate = assertCreationAccess(creation, req)
		if (!gate.ok) {
			return res.status(gate.response.status).json(gate.response.body)
		}
		return res.status(200).json(creation)
	} catch (error) {
		console.error('getCreationById error:', error)
		return res.status(500).json({ error: 'Failed to fetch creation.', code: 'FETCH_FAILED' })
	}
}

export const updateCreation = async (req, res) => {
	const { id } = req.params
	const { title, editorPayload, status, exportAssetId } = req.body

	if (title !== undefined) {
		if (typeof title !== 'string' || !title.trim()) {
			return res.status(400).json({ error: 'Invalid title.', code: 'INVALID_TITLE' })
		}
		if (title.length > MAX_TITLE_LENGTH) {
			return res
				.status(400)
				.json({ error: `Title too long. Max ${MAX_TITLE_LENGTH} characters.`, code: 'TITLE_TOO_LONG' })
		}
	}

	if (status !== undefined && !['draft', 'exported', 'published'].includes(status)) {
		return res.status(400).json({ error: 'Invalid status.', code: 'INVALID_STATUS' })
	}

	try {
		const creation = await Creation.findById(id)

		const gate = assertCreationAccess(creation, req)
		if (!gate.ok) {
			return res.status(gate.response.status).json(gate.response.body)
		}

		const nextEditorPayload = editorPayload ?? creation.editorPayload
		const nextExportAssetId = exportAssetId ?? creation.exportAssetId

		const nextTrackedMediaIds = collectPayloadMediaIds({
			editorPayload: nextEditorPayload,
			exportAssetId: nextExportAssetId,
		})

		const mergedTrackedMediaIds = [
			...new Set([...(creation.trackedMediaIds || []), ...nextTrackedMediaIds]),
		]

		if (title !== undefined) {
			creation.title = title.trim()
		}

		if (editorPayload !== undefined) {
			creation.editorPayload = editorPayload
		}

		if (status !== undefined) {
			creation.status = status
		}

		if (exportAssetId !== undefined) {
			creation.exportAssetId = exportAssetId
		}

		creation.trackedMediaIds = mergedTrackedMediaIds

		await creation.save()

		return res.status(200).json(creation)
	} catch (error) {
		console.error('updateCreation error:', error)
		return res.status(500).json({ error: 'Failed to update creation.', code: 'UPDATE_FAILED' })
	}
}

export const deleteCreation = async (req, res) => {
	const { id } = req.params

	try {
		const creation = await Creation.findById(id)

		const gate = assertCreationAccess(creation, req)
		if (!gate.ok) {
			return res.status(gate.response.status).json(gate.response.body)
		}

		await Creation.deleteOne({ _id: creation._id })

		const currentPayloadMediaIds = collectPayloadMediaIds({
			editorPayload: creation.editorPayload,
			exportAssetId: creation.exportAssetId,
		})

		const allMediaIds = [
			...new Set([...(creation.trackedMediaIds || []), ...currentPayloadMediaIds]),
		]

		await Promise.allSettled(allMediaIds.map((mediaId) => deleteMedia(mediaId)))

		return res.status(200).json({ success: true, id })
	} catch (error) {
		console.error('deleteCreation error:', error)
		return res.status(500).json({ error: 'Failed to delete creation.', code: 'DELETE_FAILED' })
	}
}

export const publishCreation = async (req, res) => {
	const { id } = req.params

	if (!req.authUserDoc) {
		return res.status(401).json({ error: 'Authentication required.', code: 'UNAUTHORIZED' })
	}

	try {
		const creation = await Creation.findById(id)

		const gate = assertCreationAccess(creation, req)
		if (!gate.ok) {
			return res.status(gate.response.status).json(gate.response.body)
		}

		if (creation.status === 'published') {
			return res.status(400).json({ error: 'Creation is already published.', code: 'ALREADY_PUBLISHED' })
		}

		creation.status = 'published'
		creation.publishedAt = new Date()

		await creation.save()

		return res.status(200).json(creation)
	} catch (error) {
		console.error('publishCreation error:', error)
		return res.status(500).json({ error: 'Failed to publish creation.', code: 'PUBLISH_FAILED' })
	}
}

export const unpublishCreation = async (req, res) => {
	const { id } = req.params

	if (!req.authUserDoc) {
		return res.status(401).json({ error: 'Authentication required.', code: 'UNAUTHORIZED' })
	}

	try {
		const creation = await Creation.findById(id)

		const gate = assertCreationAccess(creation, req)
		if (!gate.ok) {
			return res.status(gate.response.status).json(gate.response.body)
		}

		if (creation.status !== 'published') {
			return res.status(400).json({ error: 'Creation is not published.', code: 'NOT_PUBLISHED' })
		}

		creation.status = 'exported'
		creation.publishedAt = null

		await creation.save()

		return res.status(200).json(creation)
	} catch (error) {
		console.error('unpublishCreation error:', error)
		return res.status(500).json({ error: 'Failed to unpublish creation.', code: 'UNPUBLISH_FAILED' })
	}
}

export const likeCreation = async (req, res) => {
	const { id } = req.params

	if (!req.authUserDoc) {
		return res.status(401).json({ error: 'Authentication required.', code: 'UNAUTHORIZED' })
	}

	try {
		const creation = await Creation.findById(id)

		if (!creation) {
			return res.status(404).json({ error: 'Creation not found.', code: 'NOT_FOUND' })
		}

		if (creation.status !== 'published') {
			return res.status(403).json({ error: 'Only published creations can be liked.', code: 'NOT_PUBLISHED' })
		}

		const userId = req.authUserDoc._id
		const alreadyLiked = creation.likedBy.some((id) => id.equals(userId))

		if (!alreadyLiked) {
			creation.likedBy.push(userId)
			await creation.save()
		}

		return res.status(200).json({ liked: true, likeCount: creation.likedBy.length })
	} catch (error) {
		console.error('likeCreation error:', error)
		return res.status(500).json({ error: 'Failed to like creation.', code: 'LIKE_FAILED' })
	}
}

export const unlikeCreation = async (req, res) => {
	const { id } = req.params

	if (!req.authUserDoc) {
		return res.status(401).json({ error: 'Authentication required.', code: 'UNAUTHORIZED' })
	}

	try {
		const creation = await Creation.findById(id)

		if (!creation) {
			return res.status(404).json({ error: 'Creation not found.', code: 'NOT_FOUND' })
		}

		const userId = req.authUserDoc._id
		const initialCount = creation.likedBy.length
		creation.likedBy = creation.likedBy.filter((id) => !id.equals(userId))

		if (creation.likedBy.length < initialCount) {
			await creation.save()
		}

		return res.status(200).json({ liked: false, likeCount: creation.likedBy.length })
	} catch (error) {
		console.error('unlikeCreation error:', error)
		return res.status(500).json({ error: 'Failed to unlike creation.', code: 'UNLIKE_FAILED' })
	}
}

