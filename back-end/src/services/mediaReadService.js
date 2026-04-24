import { loadMedia } from './mediaUtils.js'

export const getMediaContent = async (id) => {
	const media = await loadMedia(id)
	if (!media) {
		return { error: { status: 404, error: 'Media not found.', code: 'MEDIA_NOT_FOUND' } }
	}

	return {
		status: 200,
		data: media.buffer,
		headers: {
			'Content-Type': media.mimeType,
			'Cache-Control': 'no-store',
		},
	}
}

export const getExportDownloadContent = async (id) => {
	const media = await loadMedia(id)
	if (!media) {
		return { error: { status: 404, error: 'Media not found.', code: 'MEDIA_NOT_FOUND' } }
	}

	return {
		status: 200,
		data: media.buffer,
		headers: {
			'Content-Type': media.mimeType,
			'Cache-Control': 'no-store',
			'Content-Disposition': `attachment; filename="${media.fileName || 'sticker.png'}"`,
		},
	}
}
