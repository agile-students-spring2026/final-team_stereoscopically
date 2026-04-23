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

const useImageEditingSession = ({
  mediaType,
  backendImageResult,
  previewUrl,
  sourceUrl,
  applyTransformedImage,
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

  /** Media id of the image to letterbox from (never the letterboxed export id). */
  const presetExportSourceIdRef = useRef(null)
  const originalImageMediaIdRef = useRef(null)
  const originalImageSourceUrlRef = useRef(null)
  const lastPresetExportAtRef = useRef(0)
  const presetFilterRequestIdRef = useRef(0)
  const colorFilterRequestIdRef = useRef(0)
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
    queueMicrotask(() => {
      setSelectedImageFilterPreset(DEFAULT_IMAGE_FILTER_PRESET)
      // Prefer current editor canvas (text, preset, etc.); sourceUrl is only the first upload
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
  }, [resetExportSessionState])

  /** Clear cached preset export so the next resize/export uses the current pipeline image (#31 sync). */
  const invalidateLatestExport = useCallback(() => {
    setLatestExportResult(null)
    setLastExportLetterbox(null)
  }, [])

  const clearCropSession = useCallback(() => {
    setLastCropBoxPx(null)
  }, [])

  const restoreOriginalImageFromSource = useCallback(async () => {
    const originalId = originalImageMediaIdRef.current
    if (!originalId) {
      return false
    }

    const url = `${getBackendBaseUrl()}/api/media/${originalId}`
    const result = {
      id: originalId,
      url,
      mimeType: 'image/png',
    }

    const { file, objectUrl } = await convertBackendImageResultToLocalMedia(result, {
      fallbackFileName: 'original.png',
      fallbackMimeType: 'image/png',
      fetchErrorMessage: 'Failed to restore original image preview.',
    })

    if (previewUrl && previewUrl !== sourceUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    applyTransformedImage(file, objectUrl, result)
    setLatestExportResult(null)
    setLastExportLetterbox(null)
    return true
  }, [applyTransformedImage, previewUrl, sourceUrl])

  const loadPresetFilterPreview = useCallback(async (preset) => {
    const nextPreset = preset || DEFAULT_IMAGE_FILTER_PRESET
    // Current pipeline image (crop/resize/text). originalImageMediaIdRef is only for "reset to upload".
    const filterMediaId = effectiveBackendMediaId
    const baselinePreviewSrc = effectiveImageSrc || sourceUrl
    setPresetFilterError(null)
    const requestId = ++presetFilterRequestIdRef.current

    if (nextPreset === DEFAULT_IMAGE_FILTER_PRESET) {
      setPresetFilterPreviewSrc(baselinePreviewSrc)
      setIsLoadingPresetFilterPreview(false)
      return null
    }

    if (!filterMediaId) {
      setPresetFilterError('Image is not ready on the server yet.')
      setIsLoadingPresetFilterPreview(false)
      return null
    }

    try {
      setIsLoadingPresetFilterPreview(true)
      const result = await applyPresetImageFilterFromBackend({
        mediaId: filterMediaId,
        preset: nextPreset,
      })

      if (requestId !== presetFilterRequestIdRef.current) {
        return null
      }

      if (result?.url) {
        setPresetFilterPreviewSrc(`${result.url}?cb=${Date.now()}`)
      }

      return result
    } catch (err) {
      if (requestId !== presetFilterRequestIdRef.current) {
        return null
      }
      setPresetFilterPreviewSrc(baselinePreviewSrc)
      setPresetFilterError(err?.message || 'Preview update failed.')
      return null
    } finally {
      if (requestId === presetFilterRequestIdRef.current) {
        setIsLoadingPresetFilterPreview(false)
      }
    }
  }, [effectiveBackendMediaId, effectiveImageSrc, sourceUrl])

  const selectImageFilterPreset = useCallback(async (preset) => {
    const nextPreset = preset || DEFAULT_IMAGE_FILTER_PRESET
    setSelectedImageFilterPreset(nextPreset)
    return loadPresetFilterPreview(nextPreset)
  }, [loadPresetFilterPreview])

  const applyImagePresetFilter = useCallback(async () => {
    const filterMediaId = effectiveBackendMediaId

    if (selectedImageFilterPreset === DEFAULT_IMAGE_FILTER_PRESET) {
      setSelectedImageFilterPreset(DEFAULT_IMAGE_FILTER_PRESET)
      setPresetFilterPreviewSrc(effectiveImageSrc || sourceUrl)
      setPresetFilterError(null)
      return restoreOriginalImageFromSource()
    }

    if (!filterMediaId) {
      const message = 'Image is not ready on the server yet.'
      setExportError(message)
      setPresetFilterError(message)
      return false
    }

    try {
      setExportError(null)
      setPresetFilterError(null)

      const result = await applyPresetImageFilterFromBackend({
        mediaId: filterMediaId,
        preset: selectedImageFilterPreset,
      })

      const { file, objectUrl } = await convertBackendImageResultToLocalMedia(result, {
        fetchErrorMessage: 'Failed to load preset image.',
      })

      if (previewUrl && previewUrl !== sourceUrl) {
        URL.revokeObjectURL(previewUrl)
      }

      applyTransformedImage(file, objectUrl, result)
      setLatestExportResult(null)
      setLastExportLetterbox(null)
      return true
    } catch (err) {
      const message = err?.message || 'Could not apply preset.'
      setExportError(message)
      setPresetFilterError(message)
      return false
    }
  }, [
    applyTransformedImage,
    effectiveBackendMediaId,
    previewUrl,
    effectiveImageSrc,
    restoreOriginalImageFromSource,
    selectedImageFilterPreset,
    sourceUrl,
  ])

  useEffect(() => {
    const normalized = normalizeColorAdjustments(colorAdjustments)
    const adjustmentMediaId = effectiveBackendMediaId
    const baselinePreviewSrc = effectiveImageSrc || sourceUrl

    if (isDefaultColorAdjustments(normalized)) {
      queueMicrotask(() => {
        setColorFilterPreviewSrc(baselinePreviewSrc)
        setColorFilterError(null)
        setIsLoadingColorFilterPreview(false)
      })
      return
    }

    if (!adjustmentMediaId) {
      queueMicrotask(() => {
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
      try {
        setIsLoadingColorFilterPreview(true)
        const result = await adjustImageFromBackend({
          mediaId: adjustmentMediaId,
          brightness: pctToFactor(normalized.brightness),
          contrast: pctToFactor(normalized.contrast),
          saturation: pctToFactor(normalized.saturation),
          sharpness: pctToFactor(normalized.sharpness),
        })

        if (requestId !== colorFilterRequestIdRef.current || !result?.url) return
        setColorFilterPreviewSrc(`${result.url}?cb=${Date.now()}`)
      } catch (err) {
        if (requestId !== colorFilterRequestIdRef.current) return
        setColorFilterPreviewSrc(baselinePreviewSrc)
        setColorFilterError(err?.message || 'Preview update failed.')
      } finally {
        if (requestId === colorFilterRequestIdRef.current) {
          setIsLoadingColorFilterPreview(false)
        }
      }
    }, 220)

    return () => window.clearTimeout(timer)
  }, [colorAdjustments, effectiveBackendMediaId, effectiveImageSrc, sourceUrl])

  const updateColorAdjustments = useCallback((nextAdjustments) => {
    setColorAdjustments((current) => normalizeColorAdjustments({
      ...current,
      ...(nextAdjustments || {}),
    }))
  }, [])

  const applyColorAdjustments = useCallback(async () => {
    const adjustmentMediaId = effectiveBackendMediaId
    const normalized = normalizeColorAdjustments(colorAdjustments)

    if (isDefaultColorAdjustments(normalized)) {
      setColorFilterError(null)
      return restoreOriginalImageFromSource()
    }

    if (!adjustmentMediaId) {
      const message = 'Image is not ready on the server yet.'
      setExportError(message)
      setColorFilterError(message)
      return false
    }

    try {
      setExportError(null)
      setColorFilterError(null)
      const result = await adjustImageFromBackend({
        mediaId: adjustmentMediaId,
        brightness: pctToFactor(normalized.brightness),
        contrast: pctToFactor(normalized.contrast),
        saturation: pctToFactor(normalized.saturation),
        sharpness: pctToFactor(normalized.sharpness),
      })

      const { file, objectUrl } = await convertBackendImageResultToLocalMedia(result, {
        fetchErrorMessage: 'Failed to load adjusted image.',
      })

      if (previewUrl && previewUrl !== sourceUrl) {
        URL.revokeObjectURL(previewUrl)
      }

      applyTransformedImage(file, objectUrl, result)
      setLatestExportResult(null)
      setLastExportLetterbox(null)
      return true
    } catch (err) {
      const message = err?.message || 'Could not apply adjustments.'
      setExportError(message)
      setColorFilterError(message)
      return false
    }
  }, [
    applyTransformedImage,
    colorAdjustments,
    effectiveBackendMediaId,
    previewUrl,
    restoreOriginalImageFromSource,
    sourceUrl,
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
    } catch (err) {
      console.error('Error applying crop in container:', err)
      setExportError('Could not process the cropped image.')
      throw err
    }
  }, [applyTransformedImage, effectiveBackendMediaId, resetExportSessionState])

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

      const url = `${getBackendBaseUrl()}/api/media/${originalId}`
      const result = {
        id: originalId,
        url,
        mimeType: 'image/png',
      }

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
    } catch (err) {
      console.error('Reset crop failed:', err)
      setExportError(err?.message || 'Could not reset crop to original image.')
      throw err
    } finally {
      setIsResettingCrop(false)
    }
  }, [applyTransformedImage, previewUrl, resetExportSessionState, sourceUrl])

  const handleAddTextApply = useCallback(async (textRequest) => {
    if (mediaType !== 'image') return false
    if (!effectiveBackendMediaId) {
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
      MAX_BACKEND_FONT_SIZE
    )

    try {
      setExportError(null)

      const result = await addTextToImageFromBackend({
        mediaId: effectiveBackendMediaId,
        text: textRequest?.text ?? '',
        x,
        y,
        fontFamily: textRequest?.fontFamily || textRequest?.font || 'Arial',
        fontSize,
        color: textRequest?.color || '#111111',
      })

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

      applyTransformedImage(file, objectUrl, result)
      setLatestExportResult(null)
      setLastExportLetterbox(null)
      return true
    } catch (err) {
      console.error('Add text failed:', err)
      setExportError(err?.message || 'Failed to add text to image.')
      return false
    }
  }, [applyTransformedImage, effectiveBackendMediaId, mediaType, previewUrl, sourceUrl])

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
      return true
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
      const url = `${getBackendBaseUrl()}/api/media/${restoreId}`
      const result = {
        id: restoreId,
        url,
        mimeType: 'image/png',
      }
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
  }, [applyTransformedImage, previewUrl, resetExportSessionState, sourceUrl])


  const restoreImageSession = useCallback(async (payload = {}) => {
    const {
      backendMediaId,
      lastCropBoxPx: cropPx,
      colorAdjustments: ca,
      selectedImageFilterPreset: filterPreset,
      selectedPreset: preset,
      letterboxColor: lbColor,
    } = payload

    if (!backendMediaId) return false

    try {
      setExportError(null)
      const url = `${getBackendBaseUrl()}/api/media/${backendMediaId}`
      const result = { id: backendMediaId, url, mimeType: 'image/png' }

      const { file, objectUrl } = await convertBackendImageResultToLocalMedia(result, {
        fallbackFileName: 'draft.png',
        fallbackMimeType: 'image/png',
        fetchErrorMessage: 'Failed to load draft image.',
      })

      applyTransformedImage(file, objectUrl, result)
      setLastCropBoxPx(cropPx ?? null)
      setColorAdjustments(ca ? normalizeColorAdjustments(ca) : DEFAULT_COLOR_ADJUSTMENTS)
      setSelectedImageFilterPreset(filterPreset || DEFAULT_IMAGE_FILTER_PRESET)
      setSelectedPreset(preset ?? null)
      setLetterboxColor(lbColor ?? 'transparent')
      setLatestExportResult(null)
      setLastExportLetterbox(null)
      return true
    } catch (err) {
      console.error('restoreImageSession failed:', err)
      setExportError(err?.message || 'Could not load draft image.')
      return false
    }
  }, [applyTransformedImage])

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
  }
}

export default useImageEditingSession