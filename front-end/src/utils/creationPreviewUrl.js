import { getBackendBaseUrl } from '../services/backendMediaClient.js'

/**
 * URL for a small list preview, or null to show a kind placeholder.
 */
export const getCreationPreviewUrl = (creation) => {
  if (!creation || typeof creation !== 'object') return null

  const exportId = creation.exportAssetId
  if (typeof exportId === 'string' && exportId.trim()) {
    return `${getBackendBaseUrl()}/api/media/${encodeURIComponent(exportId.trim())}`
  }

  const p = creation.editorPayload
  if (!p || typeof p !== 'object') return null

  if (p.kind === 'image' && typeof p.backendMediaId === 'string' && p.backendMediaId.trim()) {
    return `${getBackendBaseUrl()}/api/media/${encodeURIComponent(p.backendMediaId.trim())}`
  }

  return null
}

export const getCreationKindLabel = (creation) => {
  const p = creation?.editorPayload
  if (p && typeof p === 'object' && p.kind === 'video') return 'video'
  if (p && typeof p === 'object' && p.kind === 'image') return 'image'
  return null
}
