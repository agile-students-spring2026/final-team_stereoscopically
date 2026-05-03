import { resolveDraftMediaIds } from './draftMediaIds.js'

/**
 * Same-origin path for list previews so Nginx `/api/` and Vite dev proxy both work.
 */
export const getCreationPreviewUrl = (creation) => {
  if (!creation || typeof creation !== 'object') return null

  const exportId = creation.exportAssetId
  if (typeof exportId === 'string' && exportId.trim()) {
    return `/api/media/${encodeURIComponent(exportId.trim())}`
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
    return `/api/media/${encodeURIComponent(mediaId)}`
  }

  return null
}

export const getCreationKindLabel = (creation) => {
  const p = creation?.editorPayload
  if (p && typeof p === 'object' && p.kind === 'video') return 'video'
  if (p && typeof p === 'object' && p.kind === 'image') return 'image'
  return null
}

/**
 * Thumbnail / modal preview: how to render {@link getCreationPreviewUrl} for this row.
 * - Video **drafts** (no export yet): `<video>` with optional JPEG `poster` (first-frame) for fast paint + motion.
 * - Video **exported** in this app: preview URL is usually a **GIF** — use `<img>` (GIF animates).
 */
export const getCreationThumbDescriptor = (creation) => {
  const kind = getCreationKindLabel(creation)
  const p = creation?.editorPayload
  const posterId =
    typeof p?.previewPosterMediaId === 'string' && p.previewPosterMediaId.trim()
      ? p.previewPosterMediaId.trim()
      : ''
  const posterUrl = posterId ? `/api/media/${encodeURIComponent(posterId)}` : null

  const hasExport =
    typeof creation?.exportAssetId === 'string' && Boolean(creation.exportAssetId.trim())

  const url = getCreationPreviewUrl(creation)
  if (!url) {
    return { mode: 'placeholder', url: null, posterUrl: null, kind }
  }

  if (kind === 'video' && hasExport) {
    return { mode: 'image', url, posterUrl: null, kind }
  }

  if (kind === 'video') {
    return { mode: 'video', url, posterUrl, kind }
  }

  return { mode: 'image', url, posterUrl: null, kind }
}