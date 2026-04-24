import { buildDraftMediaIds } from './draftMediaIds.js'

/**
 * JSON-serializable snapshot of the current editor session.
 * Drafts should preserve editable operation state, not just flattened output.
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
  previewMediaId,
  selectedPreset,
  letterboxColor,
  lastCropBoxPx,
  colorAdjustments,
  selectedImageFilterPreset,
  textOverlay,
} = {}) => {
  const mediaIds = buildDraftMediaIds({ sourceMediaId, workingMediaId })

  return {
    kind: 'image',
    version: 3,
    ...mediaIds,
    previewMediaId: previewMediaId ?? null,

    // Legacy alias for backward compatibility while clients migrate.
    backendMediaId: mediaIds.workingMediaId,

    editState: {
      crop: lastCropBoxPx ?? null,
      resize: selectedPreset
        ? {
            preset: selectedPreset,
            letterboxColor: letterboxColor ?? 'transparent',
          }
        : null,
      presetFilter: selectedImageFilterPreset ?? 'default',
      colorAdjustments: colorAdjustments ?? {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        hue: 0,
      },
      textOverlays: textOverlay ? [textOverlay] : [],
    },

    // Keep these temporarily for migration / compatibility
    lastCropBoxPx: lastCropBoxPx ?? null,
    colorAdjustments: colorAdjustments ?? null,
    selectedImageFilterPreset: selectedImageFilterPreset ?? 'default',
    selectedPreset: selectedPreset ?? null,
    letterboxColor: letterboxColor ?? 'transparent',
    textOverlay: textOverlay ?? null,
  }
}

export const buildVideoCreationPayload = ({
  sourceMediaId,
  workingMediaId,
  previewMediaId,
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
    version: 3,
    ...mediaIds,
    previewMediaId: previewMediaId ?? null,

    // Legacy alias for backward compatibility while clients migrate.
    backendMediaId: mediaIds.workingMediaId,

    editState: {
      trim: trimRange
        ? { start: trimRange.start, end: trimRange.end }
        : { start: 0, end: 0 },
      resize: resizePreset
        ? {
            preset: resizePreset,
            borderColor: resizeBorderColor ?? null,
          }
        : null,
      speed: selectedSpeedPlaybackRate ?? 1,
      presetFilter: selectedFilterPreset ?? 'default',
      textOverlays: textOverlaySettings ? [textOverlaySettings] : [],
    },

    // Keep these temporarily for migration / compatibility
    trimRange: trimRange ? { start: trimRange.start, end: trimRange.end } : { start: 0, end: 0 },
    resizePreset: resizePreset ?? null,
    resizeBorderColor: resizeBorderColor ?? null,
    selectedSpeedPlaybackRate: selectedSpeedPlaybackRate ?? 1,
    textOverlaySettings: textOverlaySettings ?? null,
    selectedFilterPreset: selectedFilterPreset ?? 'default',
  }
}