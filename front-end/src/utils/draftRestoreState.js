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

  return {
    trimRange: editState?.trim ?? payload?.trimRange ?? { start: 0, end: 0 },
    resizePreset: editState?.resize?.preset ?? payload?.resizePreset ?? null,
    resizeBorderColor: editState?.resize?.borderColor ?? payload?.resizeBorderColor ?? null,
    selectedSpeedPlaybackRate: editState?.speed ?? payload?.selectedSpeedPlaybackRate ?? 1,
    textOverlaySettings: editState?.textOverlays?.[0] ?? payload?.textOverlaySettings ?? null,
    selectedFilterPreset: editState?.presetFilter ?? payload?.selectedFilterPreset ?? 'default',
  }
}
