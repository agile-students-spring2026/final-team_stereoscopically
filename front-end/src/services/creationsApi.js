import { getJson, patchJson, postJson } from './backendMediaClient.js'

const encodeParam = (value) => encodeURIComponent(value)

/**
 * List creations for this browser's `ownerKey`.
 */
export const fetchCreations = (ownerKey) =>
  getJson({
    path: `/api/creations?ownerKey=${encodeParam(ownerKey)}`,
    fallbackErrorMessage: 'Could not load creations.',
  })

export const createCreation = (body) =>
  postJson({
    path: '/api/creations',
    payload: body,
    fallbackErrorMessage: 'Could not save creation.',
  })

export const updateCreation = (id, body) =>
  patchJson({
    path: `/api/creations/${encodeURIComponent(id)}`,
    payload: body,
    fallbackErrorMessage: 'Could not update creation.',
  })
