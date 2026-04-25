import { getBackendBaseUrl } from '../services/backendMediaClient.js'
import { resolveDraftMediaIds } from './draftMediaIds.js'

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

  const previewMediaId =
    (typeof p.previewMediaId === 'string' && p.previewMediaId.trim()) ||
    null

  const { resumeMediaId, workingMediaId, sourceMediaId } = resolveDraftMediaIds(p)

  // For drafts, prefer previewMediaId, then resume/working media, then source.
  // This allows both image and gif/video drafts to show a real preview.
  const mediaId = previewMediaId || resumeMediaId || workingMediaId || sourceMediaId

  if (mediaId) {
    return `${getBackendBaseUrl()}/api/media/${encodeURIComponent(mediaId)}`
  }

  return null
}

export const getCreationKindLabel = (creation) => {
  const p = creation?.editorPayload
  if (p && typeof p === 'object' && p.kind === 'video') return 'video'
  if (p && typeof p === 'object' && p.kind === 'image') return 'image'
  return null
}