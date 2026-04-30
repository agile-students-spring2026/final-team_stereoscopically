import { Creation } from '../models/creationModel.js'
import { deleteMedia } from '../services/mediaStore.js'

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

export const createCreation = async (req, res) => {
    const { ownerKey, title, editorPayload, status, exportAssetId: rawExportId } = req.body

    if (!ownerKey || typeof ownerKey !== 'string' || !ownerKey.trim()) {
        return res.status(400).json({ error: 'Missing or invalid ownerKey.', code: 'INVALID_OWNER_KEY' })
    }

    if (!title || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'Missing or invalid title.', code: 'INVALID_TITLE' })
    }

    if (title.length > MAX_TITLE_LENGTH) {
        return res.status(400).json({ error: `Title too long. Max ${MAX_TITLE_LENGTH} characters.`, code: 'TITLE_TOO_LONG' })
    }

    if (!editorPayload || typeof editorPayload !== 'object') {
        return res.status(400).json({ error: 'Missing or invalid editorPayload.', code: 'INVALID_PAYLOAD' })
    }

    const exportAssetId =
        typeof rawExportId === 'string' && rawExportId.trim() ? rawExportId.trim() : null

    try {
        const trackedMediaIds = collectPayloadMediaIds({ editorPayload, exportAssetId })

        const creation = await Creation.create({
            ownerKey: ownerKey.trim(),
            title: title.trim(),
            editorPayload,
            status: status || 'draft',
            exportAssetId,
            trackedMediaIds,
        })

        return res.status(201).json(creation)
    } catch (error) {
        console.error('createCreation error:', error)
        return res.status(500).json({ error: 'Failed to save creation.', code: 'CREATE_FAILED' })
    }
}

export const getCreations = async (req, res) => {
    const { ownerKey } = req.query

    if (!ownerKey || typeof ownerKey !== 'string' || !ownerKey.trim()) {
        return res.status(400).json({ error: 'Missing or invalid ownerKey.', code: 'INVALID_OWNER_KEY' })
    }

    try {
        const creations = await Creation.find({ ownerKey: ownerKey.trim() }).sort({ updatedAt: -1 })
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
        if (!creation) {
            return res.status(404).json({ error: 'Creation not found.', code: 'NOT_FOUND' })
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
            return res.status(400).json({ error: `Title too long. Max ${MAX_TITLE_LENGTH} characters.`, code: 'TITLE_TOO_LONG' })
        }
    }

    if (status !== undefined && !['draft', 'exported'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status.', code: 'INVALID_STATUS' })
    }

    try {
        const creation = await Creation.findById(id)

        if (!creation) {
            return res.status(404).json({ error: 'Creation not found.', code: 'NOT_FOUND' })
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
        const creation = await Creation.findByIdAndDelete(id)

        if (!creation) {
            return res.status(404).json({ error: 'Creation not found.', code: 'NOT_FOUND' })
        }

        const currentPayloadMediaIds = collectPayloadMediaIds({
            editorPayload: creation.editorPayload,
            exportAssetId: creation.exportAssetId,
        })

        const allMediaIds = [
            ...new Set([...(creation.trackedMediaIds || []), ...currentPayloadMediaIds]),
        ]

        console.log('deleteCreation creation id:', id)
        console.log('deleteCreation media ids:', allMediaIds)

        await Promise.allSettled(allMediaIds.map((mediaId) => deleteMedia(mediaId)))

        return res.status(200).json({ success: true, id })
    } catch (error) {
        console.error('deleteCreation error:', error)
        return res.status(500).json({ error: 'Failed to delete creation.', code: 'DELETE_FAILED' })
    }
}