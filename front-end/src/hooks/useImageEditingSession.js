import { useCallback, useEffect, useRef, useState } from 'react'
import { getBackendBaseUrl } from '../services/backendMediaClient'
import {
  addTextToImageFromBackend,
  adjustImageFromBackend,
  applyPresetImageFilterFromBackend,
  convertBackendImageResultToLocalMedia,
  cropImageFromBackend,
  exportImageFromBackend,
} from '../services/backendImageService'
import { downloadFile } from '../utils/downloadFile'
import { resolveDraftMediaIds } from '../utils/draftMediaIds.js'

const MIN_BACKEND_FONT_SIZE = 8
const MAX_BACKEND_FONT_SIZE = 2000
const DEFAULT_BACKEND_FONT_SIZE = 110
const DEFAULT_IMAGE_FILTER_PRESET = 'default'
const DEFAULT_COLOR_ADJUSTMENTS = Object.freeze({
  brightness: 100,
  contrast: 100,
  saturation: 100,
  sharpness: 100,
})

const COLOR_FILTER_PREVIEW_DEBOUNCE_MS = 450
const COLOR_FILTER_LOADING_OVERLAY_DELAY_MS = 320

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const pctToFactor = (pct) => Math.min(2, Math.max(0, pct / 100))

const normalizeColorAdjustments = (nextAdjustments = {}) => ({
  brightness: Number.isFinite(Number(nextAdjustments.brightness)) ? Number(nextAdjustments.brightness) : 100,
  contrast: Number.isFinite(Number(nextAdjustments.contrast)) ? Number(nextAdjustments.contrast) : 100,
  saturation: Number.isFinite(Number(nextAdjustments.saturation)) ? Number(nextAdjustments.saturation) : 100,
  sharpness: Number.isFinite(Number(nextAdjustments.sharpness)) ? Number(nextAdjustments.sharpness) : 100,
})

const isDefaultColorAdjustments = (nextAdjustments = DEFAULT_COLOR_ADJUSTMENTS) => {
  const normalized = normalizeColorAdjustments(nextAdjustments)
  return (
    normalized.brightness === DEFAULT_COLOR_ADJUSTMENTS.brightness &&
    normalized.contrast === DEFAULT_COLOR_ADJUSTMENTS.contrast &&
    normalized.saturation === DEFAULT_COLOR_ADJUSTMENTS.saturation &&
    normalized.sharpness === DEFAULT_COLOR_ADJUSTMENTS.sharpness
  )
}

const hasUsableTextOverlay = (overlay) =>
  typeof overlay?.text === 'string' && overlay.text.trim().length > 0

/** Avoid double-burning text: committed canvas (`effective`) may already embed overlay pixels while overlay state stays for edits. */
const resolveDecorativeRasterBaseMediaId = ({
  baseMediaId,
  effectiveBackendMediaId,
  preTextWorkingMediaId,
  textOverlay,
}) => {
  if (!baseMediaId) return baseMediaId
  if (!hasUsableTextOverlay(textOverlay)) return baseMediaId
  const preId =
    typeof preTextWorkingMediaId === 'string' ? preTextWorkingMediaId.trim() : ''
  if (
    !preId ||
    !effectiveBackendMediaId ||
    baseMediaId !== effectiveBackendMediaId ||
    preId === effectiveBackendMediaId
  ) {
    return baseMediaId
  }
  return preId
}

const toBackendTextRequest = (overlay) => {
  const x = Number.isFinite(Number(overlay?.x)) ? Number(overlay.x) : 0.5
  const y = Number.isFinite(Number(overlay?.y)) ? Number(overlay.y) : 0.5
  const fontSize = clamp(
    Number.isFinite(Number(overlay?.fontSize))
      ? Number(overlay.fontSize)
      : DEFAULT_BACKEND_FONT_SIZE,
    MIN_BACKEND_FONT_SIZE,
    MAX_BACKEND_FONT_SIZE,
  )

  return {
    text: overlay?.text ?? '',
    x,
    y,
    fontFamily: overlay?.fontFamily || overlay?.font || 'Arial',
    fontSize,
    color: overlay?.color || '#111111',
  }
}

const useImageEditingSession = ({
  mediaType,
  backendImageResult,
  previewUrl,
  sourceUrl,
  applyTransformedImage,
  appliedTextOverlay = null,
  preTextWorkingMediaId = null,
  onPreTextWorkingMediaIdChange = null,
}) => {
  const [selectedPreset, setSelectedPreset] = useState(null)
  const [latestExportResult, setLatestExportResult] = useState(null)
  const [lastExportLetterbox, setLastExportLetterbox] = useState(null)
  const [letterboxColor, setLetterboxColor] = useState('transparent')
  const [isExporting, setIsExporting] = useState(false)
  const [isResettingCrop, setIsResettingCrop] = useState(false)
  const [exportError, setExportError] = useState(null)
  const [lastCropBoxPx, setLastCropBoxPx] = useState(null)

  const [selectedImageFilterPreset, setSelectedImageFilterPreset] = useState(DEFAULT_IMAGE_FILTER_PRESET)
  const [presetFilterPreviewSrc, setPresetFilterPreviewSrc] = useState(previewUrl || backendImageResult?.url || null)
  const [isLoadingPresetFilterPreview, setIsLoadingPresetFilterPreview] = useState(false)
  const [presetFilterError, setPresetFilterError] = useState(null)

  const [colorAdjustments, setColorAdjustments] = useState(DEFAULT_COLOR_ADJUSTMENTS)
  const [colorFilterPreviewSrc, setColorFilterPreviewSrc] = useState(previewUrl || backendImageResult?.url || null)
  const [isLoadingColorFilterPreview, setIsLoadingColorFilterPreview] = useState(false)
  const [colorFilterError, setColorFilterError] = useState(null)

  const presetExportSourceIdRef = useRef(null)
  const originalImageMediaIdRef = useRef(null)
  const originalImageSourceUrlRef = useRef(null)
  const lastPresetExportAtRef = useRef(0)
  const presetFilterRequestIdRef = useRef(0)
  const colorFilterRequestIdRef = useRef(0)
  const skipFilterResetRef = useRef(false)
  const editBaseMediaIdRef = useRef(null)
  const liveExportRef = useRef({
    selectedPreset: null,
    latestExportResult: null,
    effectiveBackendMediaId: null,
    previewUrl,
    sourceUrl,
    letterboxColor: 'transparent',
    applyTransformedImage,
  })

  const effectiveBackendResult = latestExportResult?.id ? latestExportResult : backendImageResult
  const effectiveBackendMediaId = effectiveBackendResult?.id || null
  const effectiveImageSrc = previewUrl || effectiveBackendResult?.url || null

  useEffect(() => {
    liveExportRef.current = {
      selectedPreset,
      latestExportResult,
      effectiveBackendMediaId,
      previewUrl,
      sourceUrl,
      letterboxColor,
      applyTransformedImage,
    }
  }, [
    selectedPreset,
    latestExportResult,
    effectiveBackendMediaId,
    previewUrl,
    sourceUrl,
    letterboxColor,
    applyTransformedImage,
  ])

  useEffect(() => {
    if (!latestExportResult?.id && effectiveBackendMediaId) {
      presetExportSourceIdRef.current = effectiveBackendMediaId
    }
  }, [latestExportResult, effectiveBackendMediaId])

  useEffect(() => {
    if (mediaType !== 'image') {
      originalImageMediaIdRef.current = null
      originalImageSourceUrlRef.current = null
      return
    }

    if (!sourceUrl || !backendImageResult?.id) {
      return
    }

    const sourceChanged = originalImageSourceUrlRef.current !== sourceUrl
    if (sourceChanged || !originalImageMediaIdRef.current) {
      originalImageMediaIdRef.current = backendImageResult.id
      originalImageSourceUrlRef.current = sourceUrl
    }
  }, [backendImageResult?.id, mediaType, sourceUrl])

  useEffect(() => {
    if (skipFilterResetRef.current) {
      skipFilterResetRef.current = false
      return
    }

    queueMicrotask(() => {
      setSelectedImageFilterPreset(DEFAULT_IMAGE_FILTER_PRESET)
      const pipelineSrc = effectiveImageSrc || sourceUrl
      setPresetFilterPreviewSrc(pipelineSrc)
      setPresetFilterError(null)
      setColorAdjustments(DEFAULT_COLOR_ADJUSTMENTS)
      setColorFilterPreviewSrc(pipelineSrc)
      setColorFilterError(null)
    })
  }, [effectiveBackendMediaId, effectiveImageSrc, sourceUrl])

  const resetExportSessionState = useCallback(() => {
    setSelectedPreset(null)
    setLatestExportResult(null)
    setLastExportLetterbox(null)
    setLetterboxColor('transparent')
    setExportError(null)
  }, [])

  const resetImageEditingSessionState = useCallback(() => {
    resetExportSessionState()
    setLastCropBoxPx(null)
    editBaseMediaIdRef.current = null
  }, [resetExportSessionState])

  const invalidateLatestExport = useCallback(() => {
    setLatestExportResult(null)
    setLastExportLetterbox(null)
  }, [])

  const clearCropSession = useCallback(() => {
    setLastCropBoxPx(null)
  }, [])

  const loadBackendImageResultAsLocal = useCallback(async (result, fallbackFileName = 'image.png') => {
    return convertBackendImageResultToLocalMedia(result, {
      fallbackFileName,
      fallbackMimeType: 'image/png',
      fetchErrorMessage: 'Failed to load image preview.',
    })
  }, [])

  const buildBackendMediaResult = useCallback((mediaId) => ({
    id: mediaId,
    url: `${getBackendBaseUrl()}/api/media/${mediaId}`,
    mimeType: 'image/png',
  }), [])

  const renderDecorativePipelineFromBase = useCallback(async ({
    baseMediaId,
    presetFilter = selectedImageFilterPreset,
    nextColorAdjustments = colorAdjustments,
    textOverlay = appliedTextOverlay,
    updatePreTextBase = false,
  }) => {
    if (!baseMediaId) {
      throw new Error('Image is not ready on the server yet.')
    }

    const rasterBaseMediaId = resolveDecorativeRasterBaseMediaId({
      baseMediaId,
      effectiveBackendMediaId,
      preTextWorkingMediaId,
      textOverlay,
    })

    let currentResult = buildBackendMediaResult(rasterBaseMediaId)
    let currentMediaId = rasterBaseMediaId

    if (presetFilter && presetFilter !== DEFAULT_IMAGE_FILTER_PRESET) {
      currentResult = await applyPresetImageFilterFromBackend({
        mediaId: currentMediaId,
        preset: presetFilter,
      })
      currentMediaId = currentResult.id
    }

    const normalizedAdjustments = normalizeColorAdjustments(nextColorAdjustments)
    if (!isDefaultColorAdjustments(normalizedAdjustments)) {
      currentResult = await adjustImageFromBackend({
        mediaId: currentMediaId,
        brightness: pctToFactor(normalizedAdjustments.brightness),
        contrast: pctToFactor(normalizedAdjustments.contrast),
        saturation: pctToFactor(normalizedAdjustments.saturation),
        sharpness: pctToFactor(normalizedAdjustments.sharpness),
      })
      currentMediaId = currentResult.id
    }

    const overlayUsable = hasUsableTextOverlay(textOverlay)
    const preId =
      typeof preTextWorkingMediaId === 'string' ? preTextWorkingMediaId.trim() : ''

    /** Legacy / missing saves: overlay state exists but pre-text id was never stored—the working image already has text pixels. */
    const skipComposeTextAgain =
      overlayUsable &&
      !preId &&
      effectiveBackendMediaId &&
      rasterBaseMediaId === effectiveBackendMediaId

    const shouldUpdatePreTextCheckpoint = overlayUsable && !skipComposeTextAgain

    const preTextBaseId = currentMediaId
    if (
      updatePreTextBase &&
      shouldUpdatePreTextCheckpoint &&
      typeof onPreTextWorkingMediaIdChange === 'function'
    ) {
      onPreTextWorkingMediaIdChange(preTextBaseId)
    }

    if (overlayUsable && !skipComposeTextAgain) {
      const textResult = await addTextToImageFromBackend({
        mediaId: currentMediaId,
        ...toBackendTextRequest(textOverlay),
      })

      if (!textResult?.noOp) {
        currentResult = textResult
        currentMediaId = textResult.id
      }
    }

    return {
      result: currentResult,
      preTextBaseId,
    }
  }, [
    appliedTextOverlay,
    buildBackendMediaResult,
    colorAdjustments,
    onPreTextWorkingMediaIdChange,
    selectedImageFilterPreset,
    effectiveBackendMediaId,
    preTextWorkingMediaId,
  ])

  const rebuildDecorativePipelineFromBase = useCallback(async ({
    baseMediaId,
    presetFilter = selectedImageFilterPreset,
    nextColorAdjustments = colorAdjustments,
    textOverlay = appliedTextOverlay,
  }) => {
    const { result, preTextBaseId } = await renderDecorativePipelineFromBase({
      baseMediaId,
      presetFilter,
      nextColorAdjustments,
      textOverlay,
      updatePreTextBase: true,
    })

    const { file, objectUrl } = await loadBackendImageResultAsLocal(
      result,
      hasUsableTextOverlay(textOverlay) ? 'text-overlay.png' : 'decorated.png',
    )

    return {
      result,
      file,
      objectUrl,
      preTextBaseId,
    }
  }, [
    appliedTextOverlay,
    colorAdjustments,
    loadBackendImageResultAsLocal,
    renderDecorativePipelineFromBase,
    selectedImageFilterPreset,
  ])

  /** Run preset/color/text on pre-letterbox pixels when a preset size is active; letterbox is re-applied on commit. */
  const resolveDecorativePipelineInputMediaId = useCallback(() => {
    const fromEditBase = editBaseMediaIdRef.current
    if (fromEditBase) return fromEditBase
    const presetW = selectedPreset?.width
    const presetH = selectedPreset?.height
    const preLetterboxId =
      typeof presetExportSourceIdRef.current === 'string'
        ? presetExportSourceIdRef.current.trim()
        : ''
    if (
      Number.isFinite(Number(presetW)) &&
      Number.isFinite(Number(presetH)) &&
      presetW > 0 &&
      presetH > 0 &&
      preLetterboxId
    ) {
      return preLetterboxId
    }
    return effectiveBackendMediaId
  }, [effectiveBackendMediaId, selectedPreset])

  const commitDecorativePipelineResult = useCallback(async (file, objectUrl, result) => {
    if (!result?.id) return

    const presetW = selectedPreset?.width
    const presetH = selectedPreset?.height
    const shouldReLetterbox =
      Number.isFinite(Number(presetW)) &&
      Number.isFinite(Number(presetH)) &&
      presetW > 0 &&
      presetH > 0

    const revokeOldPreview = () => {
      if (previewUrl && previewUrl !== sourceUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }

    if (shouldReLetterbox) {
      try {
        revokeOldPreview()
        skipFilterResetRef.current = true

        const exported = await exportImageFromBackend({
          mediaId: result.id,
          width: presetW,
          height: presetH,
          letterboxColor,
        })

        const { file: nextFile, objectUrl: nextUrl } = await loadBackendImageResultAsLocal(
          exported,
          hasUsableTextOverlay(appliedTextOverlay) ? 'text-overlay.png' : 'sticker.png',
        )

        applyTransformedImage(nextFile, nextUrl, exported)
        presetExportSourceIdRef.current = result.id
        setLatestExportResult(exported)
        setLastExportLetterbox(letterboxColor)
        editBaseMediaIdRef.current = null
        setSelectedImageFilterPreset(DEFAULT_IMAGE_FILTER_PRESET)
        setColorAdjustments(DEFAULT_COLOR_ADJUSTMENTS)
        return
      } catch (err) {
        console.error('Re-letterbox after filter pipeline failed:', err)
        setExportError(err?.message || 'Failed to apply output frame after filters.')
      }
    }

    revokeOldPreview()
    skipFilterResetRef.current = true
    applyTransformedImage(file, objectUrl, result)
    setLatestExportResult(null)
    setLastExportLetterbox(null)
    editBaseMediaIdRef.current = null
    setSelectedImageFilterPreset(DEFAULT_IMAGE_FILTER_PRESET)
    setColorAdjustments(DEFAULT_COLOR_ADJUSTMENTS)
  }, [
    appliedTextOverlay,
    applyTransformedImage,
    letterboxColor,
    loadBackendImageResultAsLocal,
    previewUrl,
    selectedPreset,
    sourceUrl,
  ])

  const loadPresetFilterPreview = useCallback(async (preset) => {
    const nextPreset = preset || DEFAULT_IMAGE_FILTER_PRESET
    const filterMediaId = resolveDecorativePipelineInputMediaId()
    const baselinePreviewSrc = effectiveImageSrc || sourceUrl
    setPresetFilterError(null)
    const requestId = ++presetFilterRequestIdRef.current

    if (!filterMediaId) {
      setPresetFilterError('Image is not ready on the server yet.')
      setIsLoadingPresetFilterPreview(false)
      return null
    }

    try {
      setIsLoadingPresetFilterPreview(true)

      const { result } = await renderDecorativePipelineFromBase({
        baseMediaId: filterMediaId,
        presetFilter: nextPreset,
        nextColorAdjustments: colorAdjustments,
        textOverlay: appliedTextOverlay,
        updatePreTextBase: false,
      })

      if (requestId !== presetFilterRequestIdRef.current) {
        return null
      }

      if (result?.url) {
        setPresetFilterPreviewSrc(`${result.url}?cb=${Date.now()}`)
      } else {
        setPresetFilterPreviewSrc(baselinePreviewSrc)
      }

      return result
    } catch (err) {
      if (requestId !== presetFilterRequestIdRef.current) {
        return null
      }
      setPresetFilterError(err?.message || 'Preview update failed.')
      return null
    } finally {
      if (requestId === presetFilterRequestIdRef.current) {
        setIsLoadingPresetFilterPreview(false)
      }
    }
  }, [
    appliedTextOverlay,
    colorAdjustments,
    effectiveBackendMediaId,
    effectiveImageSrc,
    renderDecorativePipelineFromBase,
    resolveDecorativePipelineInputMediaId,
    sourceUrl,
  ])

  const selectImageFilterPreset = useCallback(async (preset) => {
    const nextPreset = preset || DEFAULT_IMAGE_FILTER_PRESET
    setSelectedImageFilterPreset(nextPreset)
    return loadPresetFilterPreview(nextPreset)
  }, [loadPresetFilterPreview])

  const applyImagePresetFilter = useCallback(async () => {
    const baseMediaId = resolveDecorativePipelineInputMediaId()
    if (!baseMediaId) {
      const message = 'Image is not ready on the server yet.'
      setExportError(message)
      setPresetFilterError(message)
      return false
    }

    try {
      setExportError(null)
      setPresetFilterError(null)

      const { result, file, objectUrl } = await rebuildDecorativePipelineFromBase({
        baseMediaId,
        presetFilter: selectedImageFilterPreset,
        nextColorAdjustments: colorAdjustments,
        textOverlay: appliedTextOverlay,
      })

      await commitDecorativePipelineResult(file, objectUrl, result)
      return true
    } catch (err) {
      const message = err?.message || 'Could not apply preset.'
      setExportError(message)
      setPresetFilterError(message)
      return false
    }
  }, [
    appliedTextOverlay,
    colorAdjustments,
    commitDecorativePipelineResult,
    rebuildDecorativePipelineFromBase,
    resolveDecorativePipelineInputMediaId,
    selectedImageFilterPreset,
  ])

  useEffect(() => {
    const normalized = normalizeColorAdjustments(colorAdjustments)
    const adjustmentMediaId = resolveDecorativePipelineInputMediaId()
    const baselinePreviewSrc = effectiveImageSrc || sourceUrl

    if (!adjustmentMediaId) {
      queueMicrotask(() => {
        setColorFilterPreviewSrc(baselinePreviewSrc)
        setColorFilterError('Image is not ready on the server yet.')
        setIsLoadingColorFilterPreview(false)
      })
      return
    }

    const requestId = ++colorFilterRequestIdRef.current
    queueMicrotask(() => {
      setColorFilterError(null)
    })

    const timer = window.setTimeout(async () => {
      let loadingOverlayTimer = null
      try {
        loadingOverlayTimer = window.setTimeout(() => {
          if (requestId === colorFilterRequestIdRef.current) {
            setIsLoadingColorFilterPreview(true)
          }
        }, COLOR_FILTER_LOADING_OVERLAY_DELAY_MS)

        const { result } = await renderDecorativePipelineFromBase({
          baseMediaId: adjustmentMediaId,
          presetFilter: selectedImageFilterPreset,
          nextColorAdjustments: normalized,
          textOverlay: appliedTextOverlay,
          updatePreTextBase: false,
        })

        if (requestId !== colorFilterRequestIdRef.current || !result?.url) return
        setColorFilterPreviewSrc(`${result.url}?cb=${Date.now()}`)
      } catch (err) {
        if (requestId !== colorFilterRequestIdRef.current) return
        setColorFilterError(err?.message || 'Preview update failed.')
      } finally {
        if (loadingOverlayTimer) window.clearTimeout(loadingOverlayTimer)
        if (requestId === colorFilterRequestIdRef.current) {
          setIsLoadingColorFilterPreview(false)
        }
      }
    }, COLOR_FILTER_PREVIEW_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [
    appliedTextOverlay,
    colorAdjustments,
    effectiveBackendMediaId,
    effectiveImageSrc,
    renderDecorativePipelineFromBase,
    resolveDecorativePipelineInputMediaId,
    selectedImageFilterPreset,
    selectedPreset,
    sourceUrl,
  ])

  const updateColorAdjustments = useCallback((nextAdjustments) => {
    setColorAdjustments((current) => normalizeColorAdjustments({
      ...current,
      ...(nextAdjustments || {}),
    }))
  }, [])

  const applyColorAdjustments = useCallback(async () => {
    const baseMediaId = resolveDecorativePipelineInputMediaId()
    if (!baseMediaId) {
      const message = 'Image is not ready on the server yet.'
      setExportError(message)
      setColorFilterError(message)
      return false
    }

    try {
      setExportError(null)
      setColorFilterError(null)

      const { result, file, objectUrl } = await rebuildDecorativePipelineFromBase({
        baseMediaId,
        presetFilter: selectedImageFilterPreset,
        nextColorAdjustments: colorAdjustments,
        textOverlay: appliedTextOverlay,
      })

      await commitDecorativePipelineResult(file, objectUrl, result)
      return true
    } catch (err) {
      const message = err?.message || 'Could not apply adjustments.'
      setExportError(message)
      setColorFilterError(message)
      return false
    }
  }, [
    appliedTextOverlay,
    colorAdjustments,
    commitDecorativePipelineResult,
    rebuildDecorativePipelineFromBase,
    resolveDecorativePipelineInputMediaId,
    selectedImageFilterPreset,
  ])

  const handleSizeSelect = useCallback(async (size, options = {}) => {
    const appliedLetterboxColor = options?.letterboxColor ?? letterboxColor
    const inputMediaId = latestExportResult?.id
      ? presetExportSourceIdRef.current
      : effectiveBackendMediaId

    if (!inputMediaId) {
      setExportError('Image is not ready for backend export yet. Please re-upload and try again.')
      return false
    }

    try {
      setIsExporting(true)
      setExportError(null)

      const exported = await exportImageFromBackend({
        mediaId: inputMediaId,
        width: size.width,
        height: size.height,
        letterboxColor: appliedLetterboxColor,
      })

      const { file, objectUrl } = await convertBackendImageResultToLocalMedia(exported, {
        fallbackFileName: 'sticker.png',
        fallbackMimeType: 'image/png',
        fetchErrorMessage: 'Failed to load exported image preview.',
      })

      if (previewUrl && previewUrl !== sourceUrl) {
        URL.revokeObjectURL(previewUrl)
      }

      applyTransformedImage(file, objectUrl, exported)
      presetExportSourceIdRef.current = inputMediaId
      lastPresetExportAtRef.current = Date.now()
      setSelectedPreset(size)
      setLatestExportResult(exported)
      setLastExportLetterbox(appliedLetterboxColor)
      return true
    } catch (err) {
      console.error('Preset export failed:', err)
      setExportError(err?.message || 'Failed to export image at the selected size.')
      return false
    } finally {
      setIsExporting(false)
    }
  }, [applyTransformedImage, effectiveBackendMediaId, latestExportResult, letterboxColor, previewUrl, sourceUrl])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (Date.now() - lastPresetExportAtRef.current < 450) return

      const {
        selectedPreset: sp,
        latestExportResult: ler,
        effectiveBackendMediaId: eid,
        previewUrl: purl,
        sourceUrl: surl,
        letterboxColor: lb,
        applyTransformedImage: apply,
      } = liveExportRef.current

      if (!sp?.width) return

      const inputMediaId = ler?.id ? presetExportSourceIdRef.current : eid
      if (!inputMediaId) return

      void (async () => {
        try {
          setIsExporting(true)
          setExportError(null)
          const exported = await exportImageFromBackend({
            mediaId: inputMediaId,
            width: sp.width,
            height: sp.height,
            letterboxColor: lb,
          })
          const { file, objectUrl } = await convertBackendImageResultToLocalMedia(exported, {
            fallbackFileName: 'sticker.png',
            fallbackMimeType: 'image/png',
            fetchErrorMessage: 'Failed to load exported image preview.',
          })
          if (purl && purl !== surl) {
            URL.revokeObjectURL(purl)
          }
          apply(file, objectUrl, exported)
          presetExportSourceIdRef.current = inputMediaId
          lastPresetExportAtRef.current = Date.now()
          setLatestExportResult(exported)
          setLastExportLetterbox(lb)
        } catch (err) {
          console.error('Preset preview refresh failed:', err)
          setExportError(err?.message || 'Failed to update preview for letterbox.')
        } finally {
          setIsExporting(false)
        }
      })()
    }, 320)

    return () => window.clearTimeout(timer)
  }, [letterboxColor])

  const handleCropApply = useCallback(async (cropRequest) => {
    const cropSourceMediaId = effectiveBackendMediaId
    const ratioCrop = cropRequest?.ratio

    if (!cropSourceMediaId) {
      const err = new Error('Image is not ready for crop yet. Please re-upload and try again.')
      setExportError(err.message)
      throw err
    }

    if (!ratioCrop) {
      const err = new Error('Crop preview is not ready yet. Please try again.')
      setExportError(err.message)
      throw err
    }

    try {
      setExportError(null)
      const result = await cropImageFromBackend({
        mediaId: cropSourceMediaId,
        x: ratioCrop.x,
        y: ratioCrop.y,
        width: ratioCrop.width,
        height: ratioCrop.height,
        unit: cropRequest?.unit || 'ratio',
      })

      const { file, objectUrl } = await convertBackendImageResultToLocalMedia(result, {
        fallbackFileName: 'cropped.png',
        fallbackMimeType: 'image/png',
        fetchErrorMessage: 'Failed to fetch cropped image',
      })

      applyTransformedImage(file, objectUrl, result)
      resetExportSessionState()
      setLastCropBoxPx(cropRequest?.pixels || null)
      editBaseMediaIdRef.current = null

      if (typeof onPreTextWorkingMediaIdChange === 'function') {
        onPreTextWorkingMediaIdChange(null)
      }
    } catch (err) {
      console.error('Error applying crop in container:', err)
      setExportError('Could not process the cropped image.')
      throw err
    }
  }, [applyTransformedImage, effectiveBackendMediaId, onPreTextWorkingMediaIdChange, resetExportSessionState])

  const resetCropToOriginal = useCallback(async () => {
    const originalId = originalImageMediaIdRef.current
    if (!originalId) {
      const err = new Error('Original image is not available for crop reset yet.')
      setExportError(err.message)
      throw err
    }

    try {
      setIsResettingCrop(true)
      setExportError(null)

      const result = buildBackendMediaResult(originalId)

      const { file, objectUrl } = await convertBackendImageResultToLocalMedia(result, {
        fallbackFileName: 'original.png',
        fetchErrorMessage: 'Failed to restore original image preview.',
      })

      if (previewUrl && previewUrl !== sourceUrl) {
        URL.revokeObjectURL(previewUrl)
      }

      applyTransformedImage(file, objectUrl, result)
      resetExportSessionState()
      setLastCropBoxPx(null)
      presetExportSourceIdRef.current = originalId
      lastPresetExportAtRef.current = Date.now()
      editBaseMediaIdRef.current = null

      if (typeof onPreTextWorkingMediaIdChange === 'function') {
        onPreTextWorkingMediaIdChange(null)
      }
    } catch (err) {
      console.error('Reset crop failed:', err)
      setExportError(err?.message || 'Could not reset crop to original image.')
      throw err
    } finally {
      setIsResettingCrop(false)
    }
  }, [applyTransformedImage, buildBackendMediaResult, onPreTextWorkingMediaIdChange, previewUrl, resetExportSessionState, sourceUrl])

  const handleAddTextApply = useCallback(async (textRequest) => {
    if (mediaType !== 'image') return false
    const baseMediaId = textRequest?._overrideBaseMediaId || effectiveBackendMediaId
    if (!baseMediaId) {
      setExportError('Image is not ready for text overlay yet. Please re-upload and try again.')
      return false
    }

    const x = Number.isFinite(Number(textRequest?.x)) ? Number(textRequest.x) : 0.5
    const y = Number.isFinite(Number(textRequest?.y)) ? Number(textRequest.y) : 0.5
    const fontSize = clamp(
      Number.isFinite(Number(textRequest?.fontSize))
        ? Number(textRequest.fontSize)
        : DEFAULT_BACKEND_FONT_SIZE,
      MIN_BACKEND_FONT_SIZE,
      MAX_BACKEND_FONT_SIZE,
    )

    try {
      setExportError(null)

      const result = await addTextToImageFromBackend({
        mediaId: baseMediaId,
        text: textRequest?.text ?? '',
        x,
        y,
        fontFamily: textRequest?.fontFamily || textRequest?.font || 'Arial',
        fontSize,
        color: textRequest?.color || '#111111',
      })

      if (typeof onPreTextWorkingMediaIdChange === 'function') {
        onPreTextWorkingMediaIdChange(baseMediaId)
      }

      if (result?.noOp) {
        return true
      }

      const { file, objectUrl } = await convertBackendImageResultToLocalMedia(result, {
        fallbackFileName: 'text-overlay.png',
        fallbackMimeType: 'image/png',
        fetchErrorMessage: 'Failed to load text-overlay image preview.',
      })

      if (previewUrl && previewUrl !== sourceUrl) {
        URL.revokeObjectURL(previewUrl)
      }

      // Keep Preset / Color slider state aligned with decorative pipeline — same as preset/color apply flows.
      skipFilterResetRef.current = true
      applyTransformedImage(file, objectUrl, result)
      setLatestExportResult(null)
      setLastExportLetterbox(null)
      return true
    } catch (err) {
      console.error('Add text failed:', err)
      setExportError(err?.message || 'Failed to add text to image.')
      return false
    }
  }, [
    applyTransformedImage,
    effectiveBackendMediaId,
    mediaType,
    onPreTextWorkingMediaIdChange,
    previewUrl,
    sourceUrl,
  ])

  const handleExport = useCallback(async () => {
    if (mediaType !== 'image') return false
    if (!selectedPreset) {
      setExportError('Please choose a preset size before exporting.')
      return false
    }
    const exportInputMediaId = latestExportResult?.id
      ? presetExportSourceIdRef.current
      : effectiveBackendMediaId

    if (!exportInputMediaId) {
      setExportError('Image is not ready for backend export yet. Please re-upload and try again.')
      return false
    }

    try {
      setIsExporting(true)
      setExportError(null)
      const dimsMatch =
        latestExportResult &&
        latestExportResult.width === selectedPreset.width &&
        latestExportResult.height === selectedPreset.height
      const letterboxMatch = lastExportLetterbox === letterboxColor

      const exported =
        dimsMatch && letterboxMatch
          ? latestExportResult
          : await exportImageFromBackend({
              mediaId: exportInputMediaId,
              width: selectedPreset.width,
              height: selectedPreset.height,
              letterboxColor,
            })

      setLatestExportResult(exported)
      setLastExportLetterbox(letterboxColor)
      downloadFile(exported.downloadUrl || exported.url, exported.fileName || 'sticker.png')
      return exported
    } catch (err) {
      console.error('Download export failed:', err)
      setExportError(err?.message || 'Failed to download exported image.')
      return false
    } finally {
      setIsExporting(false)
    }
  }, [
    effectiveBackendMediaId,
    lastExportLetterbox,
    latestExportResult,
    letterboxColor,
    mediaType,
    selectedPreset,
  ])

  const resetPresetExportSettings = useCallback(async () => {
    const restoreId = presetExportSourceIdRef.current
    resetExportSessionState()
    if (!restoreId) return
    try {
      setExportError(null)
      const result = buildBackendMediaResult(restoreId)
      const { file, objectUrl } = await convertBackendImageResultToLocalMedia(result, {
        fallbackFileName: 'restored.png',
        fetchErrorMessage: 'Failed to restore image preview.',
      })
      if (previewUrl && previewUrl !== sourceUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      applyTransformedImage(file, objectUrl, result)
      presetExportSourceIdRef.current = restoreId
      lastPresetExportAtRef.current = Date.now()
    } catch (err) {
      console.error('Reset export settings failed:', err)
      setExportError(err?.message || 'Could not restore preview after reset.')
    }
  }, [applyTransformedImage, buildBackendMediaResult, previewUrl, resetExportSessionState, sourceUrl])

  const restoreImageSession = useCallback(async (payload = {}) => {
    const editState = payload?.editState ?? {}

    const cropPx = editState?.crop ?? payload?.lastCropBoxPx ?? null
    const colorState =
      editState?.colorAdjustments ??
      payload?.colorAdjustments ??
      DEFAULT_COLOR_ADJUSTMENTS
    const filterPreset =
      editState?.presetFilter ??
      payload?.selectedImageFilterPreset ??
      DEFAULT_IMAGE_FILTER_PRESET
    const resizeState = editState?.resize ?? null
    const preset = resizeState?.preset ?? payload?.selectedPreset ?? null
    const lbColor =
      resizeState?.letterboxColor ??
      payload?.letterboxColor ??
      'transparent'
    const preEditWorkingMediaId = payload?.preEditWorkingMediaId ?? null

    const { sourceMediaId, workingMediaId } = resolveDraftMediaIds(payload)
    const candidateIds = [workingMediaId, sourceMediaId].filter(Boolean)
    const uniqueCandidateIds = [...new Set(candidateIds)]

    if (!uniqueCandidateIds.length) return false

    try {
      setExportError(null)
      let restoredResult = null
      let restoredFile = null
      let restoredObjectUrl = null

      for (const mediaId of uniqueCandidateIds) {
        try {
          const result = buildBackendMediaResult(mediaId)
          const converted = await convertBackendImageResultToLocalMedia(result, {
            fallbackFileName: 'draft.png',
            fallbackMimeType: 'image/png',
            fetchErrorMessage: 'Failed to load draft image.',
          })

          restoredResult = result
          restoredFile = converted.file
          restoredObjectUrl = converted.objectUrl
          break
        } catch {
          // try next candidate
        }
      }

      if (!restoredResult || !restoredFile || !restoredObjectUrl) {
        throw new Error('Could not restore draft image.')
      }

      skipFilterResetRef.current = true
      applyTransformedImage(restoredFile, restoredObjectUrl, restoredResult)

      originalImageMediaIdRef.current = sourceMediaId || restoredResult.id
      editBaseMediaIdRef.current = preEditWorkingMediaId || null

      setLastCropBoxPx(cropPx)
      setColorAdjustments(normalizeColorAdjustments(colorState))
      setSelectedImageFilterPreset(filterPreset)
      setSelectedPreset(preset)
      setLetterboxColor(lbColor)
      setLatestExportResult(null)
      setLastExportLetterbox(null)

      return true
    } catch (err) {
      console.error('restoreImageSession failed:', err)
      setExportError(err?.message || 'Could not load draft image.')
      return false
    }
  }, [applyTransformedImage, buildBackendMediaResult])

  return {
    selectedPreset,
    latestExportResult,
    lastExportLetterbox,
    letterboxColor,
    setLetterboxColor,
    isExporting,
    isResettingCrop,
    exportError,
    lastCropBoxPx,
    hasCropHistory: Boolean(lastCropBoxPx),
    effectiveBackendResult,
    effectiveBackendMediaId,
    effectiveImageSrc,
    selectedImageFilterPreset,
    presetFilterPreviewSrc,
    isLoadingPresetFilterPreview,
    presetFilterError,
    colorAdjustments,
    colorFilterPreviewSrc,
    isLoadingColorFilterPreview,
    colorFilterError,
    resetExportSessionState,
    resetImageEditingSessionState,
    clearCropSession,
    handleSizeSelect,
    handleCropApply,
    resetCropToOriginal,
    handleAddTextApply,
    handleExport,
    resetPresetExportSettings,
    invalidateLatestExport,
    selectImageFilterPreset,
    applyImagePresetFilter,
    updateColorAdjustments,
    applyColorAdjustments,
    restoreImageSession,
    get editBaseMediaId() {
      return editBaseMediaIdRef.current
    },
  }
}

export default useImageEditingSession