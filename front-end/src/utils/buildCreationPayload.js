import { buildDraftMediaIds } from './draftMediaIds.js'

/**
 * JSON-serializable snapshot of the current editor session (for draft persistence).
 * Opening drafts is handled in a separate task; this is storage-oriented metadata.
 */

const stripExtension = (name) => {
  if (!name || typeof name !== 'string') return ''
  return name.replace(/\.[^.]+$/, '') || 'Sticker'
}

export const defaultCreationTitle = (file) => {
  if (file?.name && typeof file.name === 'string') {
    const base = stripExtension(file.name)
    return base.slice(0, 120) || 'Untitled sticker'
  }
  return 'Untitled sticker'
}

export const buildImageCreationPayload = ({
  sourceMediaId,
  workingMediaId,
  preEditWorkingMediaId,
  preTextWorkingMediaId,
  textOverlay,
  lastCropBoxPx,
  colorAdjustments,
  selectedImageFilterPreset,
  selectedPreset,
  letterboxColor,
} = {}) => {
  const mediaIds = buildDraftMediaIds({ sourceMediaId, workingMediaId })

  return {
    kind: 'image',
    version: 2,
    ...mediaIds,
    // Legacy alias for backward compatibility while clients migrate.
    backendMediaId: mediaIds.workingMediaId,
    preEditWorkingMediaId: preEditWorkingMediaId ?? null,
    preTextWorkingMediaId: preTextWorkingMediaId ?? null,
    textOverlay: textOverlay ?? null,
    lastCropBoxPx: lastCropBoxPx ?? null,
    colorAdjustments: colorAdjustments ?? null,
    selectedImageFilterPreset: selectedImageFilterPreset ?? 'default',
    selectedPreset: selectedPreset ?? null,
    letterboxColor: letterboxColor ?? 'transparent',
  }
}

export const buildVideoCreationPayload = ({
  sourceMediaId,
  workingMediaId,
  trimRange,
  resizePreset,
  resizeBorderColor,
  selectedSpeedPlaybackRate,
  textOverlaySettings,
  selectedFilterPreset,
} = {}) => {
  const mediaIds = buildDraftMediaIds({ sourceMediaId, workingMediaId })

  return {
    kind: 'video',
    version: 2,
    ...mediaIds,
    // Legacy alias for backward compatibility while clients migrate.
    backendMediaId: mediaIds.workingMediaId,
    trimRange: trimRange ? { start: trimRange.start, end: trimRange.end } : { start: 0, end: 0 },
    resizePreset: resizePreset ?? null,
    resizeBorderColor: resizeBorderColor ?? null,
    selectedSpeedPlaybackRate: selectedSpeedPlaybackRate ?? 1,
    textOverlaySettings: textOverlaySettings ?? null,
    selectedFilterPreset: selectedFilterPreset ?? 'default',
  }
}