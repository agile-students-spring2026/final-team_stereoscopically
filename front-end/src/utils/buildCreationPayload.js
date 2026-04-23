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
  backendMediaId,
  lastCropBoxPx,
  colorAdjustments,
  selectedImageFilterPreset,
  selectedPreset,
  letterboxColor,
} = {}) => ({
  kind: 'image',
  version: 1,
  backendMediaId: backendMediaId ?? null,
  lastCropBoxPx: lastCropBoxPx ?? null,
  colorAdjustments: colorAdjustments ?? null,
  selectedImageFilterPreset: selectedImageFilterPreset ?? 'default',
  selectedPreset: selectedPreset ?? null,
  letterboxColor: letterboxColor ?? 'transparent',
})

export const buildVideoCreationPayload = ({
  trimRange,
  resizePreset,
  resizeBorderColor,
  selectedSpeedPlaybackRate,
  textOverlaySettings,
  selectedFilterPreset,
} = {}) => ({
  kind: 'video',
  version: 1,
  trimRange: trimRange ? { start: trimRange.start, end: trimRange.end } : { start: 0, end: 0 },
  resizePreset: resizePreset ?? null,
  resizeBorderColor: resizeBorderColor ?? null,
  selectedSpeedPlaybackRate: selectedSpeedPlaybackRate ?? 1,
  textOverlaySettings: textOverlaySettings ?? null,
  selectedFilterPreset: selectedFilterPreset ?? 'default',
})
