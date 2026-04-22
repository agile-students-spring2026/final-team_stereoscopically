import { Creation } from '../models/CreationModel.js'

const MAX_TITLE_LENGTH = 200

export const createCreation = async (req, res) => {
    const { ownerKey, title, editorPayload, status } = req.body

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

    try {
        const creation = await Creation.create({ ownerKey: ownerKey.trim(), title: title.trim(), editorPayload, status: status || 'draft' })
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
        const creation = await Creation.findByIdAndUpdate(
            id,
            { title, editorPayload, status, exportAssetId },
            { new: true, runValidators: true }
        )
        if (!creation) {
            return res.status(404).json({ error: 'Creation not found.', code: 'NOT_FOUND' })
        }
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
        return res.status(200).json({ success: true, id })
    } catch (error) {
        console.error('deleteCreation error:', error)
        return res.status(500).json({ error: 'Failed to delete creation.', code: 'DELETE_FAILED' })
    }
}