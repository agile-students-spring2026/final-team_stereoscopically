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

  // Image drafts can preview from their resume media.
  if (p.kind === 'image') {
    const { resumeMediaId } = resolveDraftMediaIds(p)
    if (resumeMediaId) {
      return `${getBackendBaseUrl()}/api/media/${encodeURIComponent(resumeMediaId)}`
    }
  }

  // Video drafts should only preview an exported asset.
  // Without exportAssetId, return null so the UI can show a video placeholder.
  return null
}

export const getCreationKindLabel = (creation) => {
  const p = creation?.editorPayload
  if (p && typeof p === 'object' && p.kind === 'video') return 'video'
  if (p && typeof p === 'object' && p.kind === 'image') return 'image'
  return null
}
