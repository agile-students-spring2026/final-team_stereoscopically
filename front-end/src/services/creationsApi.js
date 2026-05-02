import { deleteJson, getJson, patchJson, postJson } from './backendMediaClient.js'
import { getAuthToken } from '../auth/authSession.js'
import { getOrCreateOwnerKey } from '../utils/ownerKey.js'

const fallbackGuestOwnerKey = (explicit) =>
	(typeof explicit === 'string' ? explicit.trim() : '') || getOrCreateOwnerKey()

const encodeParam = (value) => encodeURIComponent(value)

/** Query suffix for guests on single-resource mutations. */
const ownershipQuerySuffix = (guestOwnerKey) => {
	if (getAuthToken()) return ''
	const key = fallbackGuestOwnerKey(
		guestOwnerKey != null && typeof guestOwnerKey === 'string' ? guestOwnerKey : '',
	)
	if (!key) return ''
	return `?ownerKey=${encodeParam(key)}`
}

/**
 * List drafts: Bearer user → scoped by account. Guests must pass a non-empty `guestOwnerKey`.
 */
export const fetchCreations = (guestOwnerKey) => {
	let path = '/api/creations'
	if (!getAuthToken()) {
		const key = fallbackGuestOwnerKey(typeof guestOwnerKey === 'string' ? guestOwnerKey : '')
		path = `/api/creations?ownerKey=${encodeParam(key)}`
	}
	return getJson({
		path,
		fallbackErrorMessage: 'Could not load creations.',
	})
}

const creationBodyWithOwnership = (body, guestOwnerKey) => {
	const next = { ...(body ?? {}) }
	if (getAuthToken()) {
		delete next.ownerKey
		return next
	}
	const fromParam = typeof guestOwnerKey === 'string' ? guestOwnerKey.trim() : ''
	const fromBody = typeof next.ownerKey === 'string' ? next.ownerKey.trim() : ''
	const key = fromParam || fromBody || fallbackGuestOwnerKey('')
	return { ...next, ownerKey: key }
}

export const createCreation = (body, { guestOwnerKey } = {}) =>
	postJson({
		path: '/api/creations',
		payload: creationBodyWithOwnership(body, guestOwnerKey),
		fallbackErrorMessage: 'Could not save creation.',
	})

export const updateCreation = (id, body, { guestOwnerKey } = {}) =>
	patchJson({
		path: `/api/creations/${encodeURIComponent(id)}${ownershipQuerySuffix(guestOwnerKey)}`,
		payload: body,
		fallbackErrorMessage: 'Could not update creation.',
	})

export const deleteCreation = (id, { guestOwnerKey } = {}) =>
	deleteJson({
		path: `/api/creations/${encodeURIComponent(id)}${ownershipQuerySuffix(guestOwnerKey)}`,
		fallbackErrorMessage: 'Could not delete creation.',
	})

export const publishCreation = (id) =>
	postJson({
		path: `/api/creations/${encodeURIComponent(id)}/publish`,
		payload: {},
		fallbackErrorMessage: 'Could not publish creation.',
	})

export const unpublishCreation = (id) =>
	postJson({
		path: `/api/creations/${encodeURIComponent(id)}/unpublish`,
		payload: {},
		fallbackErrorMessage: 'Could not unpublish creation.',
	})

export const likeCreation = (id) =>
	postJson({
		path: `/api/creations/${encodeURIComponent(id)}/like`,
		payload: {},
		fallbackErrorMessage: 'Could not like creation.',
	})

export const unlikeCreation = (id) =>
	postJson({
		path: `/api/creations/${encodeURIComponent(id)}/unlike`,
		payload: {},
		fallbackErrorMessage: 'Could not unlike creation.',
	})

