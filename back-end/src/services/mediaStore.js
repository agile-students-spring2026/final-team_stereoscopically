import { MEDIA_TTL_MS } from '../config/constants.js'

const inMemoryMediaStore = new Map()

const now = () => Date.now()

const withExpiry = (media) => ({
	...media,
	expiresAt: now() + MEDIA_TTL_MS,
})

export const createMedia = (id, media) => {
	inMemoryMediaStore.set(id, withExpiry(media))
}

export const getMedia = (id) => inMemoryMediaStore.get(id)

export const deleteMedia = (id) => {
	inMemoryMediaStore.delete(id)
}

export const isMediaExpired = (media) => !media || media.expiresAt <= now()

export const getActiveMediaOrDeleteExpired = (id) => {
	const media = getMedia(id)
	if (!media) {
		return null
	}

	if (isMediaExpired(media)) {
		deleteMedia(id)
		return null
	}

	return media
}

export const purgeExpiredMedia = () => {
	for (const [id, media] of inMemoryMediaStore.entries()) {
		if (isMediaExpired(media)) {
			deleteMedia(id)
		}
	}
}
