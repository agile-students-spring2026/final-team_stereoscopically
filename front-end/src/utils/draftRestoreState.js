export const getImageDraftRestoreState = (payload = {}) => {
  const editState = payload?.editState ?? {}

  return {
    crop: editState?.crop ?? payload?.lastCropBoxPx ?? null,
    resize: editState?.resize ?? null,
    presetFilter: editState?.presetFilter ?? payload?.selectedImageFilterPreset ?? 'default',
    colorAdjustments: editState?.colorAdjustments ?? payload?.colorAdjustments ?? null,
    textOverlay: editState?.textOverlays?.[0] ?? payload?.textOverlay ?? null,
  }
}

export const getVideoDraftRestoreState = (payload = {}) => {
  const editState = payload?.editState ?? {}
  const fromEdit = editState?.textOverlays?.[0]
  const fromRoot = payload?.textOverlaySettings
  // Merge root + editState overlay so text in `editState.textOverlays[0]` is not dropped when root `textOverlaySettings` exists but is missing `text`.
  const textOverlaySettings =
    fromRoot || fromEdit
      ? {
          ...(typeof fromRoot === 'object' && fromRoot ? fromRoot : {}),
          ...(typeof fromEdit === 'object' && fromEdit ? fromEdit : {}),
        }
      : null

  return {
    trimRange: editState?.trim ?? payload?.trimRange ?? { start: 0, end: 0 },
    resizePreset: editState?.resize?.preset ?? payload?.resizePreset ?? null,
    resizeBorderColor: editState?.resize?.borderColor ?? payload?.resizeBorderColor ?? null,
    selectedSpeedPlaybackRate: editState?.speed ?? payload?.selectedSpeedPlaybackRate ?? 1,
    textOverlaySettings,
    selectedFilterPreset: editState?.presetFilter ?? payload?.selectedFilterPreset ?? 'default',
  }
}
