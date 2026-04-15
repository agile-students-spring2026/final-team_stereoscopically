import { useCallback, useEffect, useRef, useState } from 'react'
import { getBackendBaseUrl } from '../services/backendMediaClient'
import {
  addTextToImageFromBackend,
  convertBackendImageResultToLocalMedia,
  cropImageFromBackend,
  exportImageFromBackend,
} from '../services/backendImageService'
import { downloadFile } from '../utils/downloadFile'

const MIN_BACKEND_FONT_SIZE = 8
const MAX_BACKEND_FONT_SIZE = 2000
const DEFAULT_BACKEND_FONT_SIZE = 110

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

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
  const [exportError, setExportError] = useState(null)
  const [sessionNotice, setSessionNotice] = useState(null)
  const [lastCropBoxPx, setLastCropBoxPx] = useState(null)

  /** Media id of the image to letterbox from (never the letterboxed export id). */
  const presetExportSourceIdRef = useRef(null)
  const lastPresetExportAtRef = useRef(0)
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

  liveExportRef.current = {
    selectedPreset,
    latestExportResult,
    effectiveBackendMediaId,
    previewUrl,
    sourceUrl,
    letterboxColor,
    applyTransformedImage,
  }

  useEffect(() => {
    if (!latestExportResult?.id && effectiveBackendMediaId) {
      presetExportSourceIdRef.current = effectiveBackendMediaId
    }
  }, [latestExportResult, effectiveBackendMediaId])

  const resetExportSessionState = useCallback(() => {
    setSelectedPreset(null)
    setLatestExportResult(null)
    setLastExportLetterbox(null)
    setLetterboxColor('transparent')
    setExportError(null)
  }, [])

  const resetImageEditingSessionState = useCallback(() => {
    resetExportSessionState()
    setSessionNotice(null)
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

  const handleSizeSelect = useCallback(async (size) => {
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
        letterboxColor,
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
      setLastExportLetterbox(letterboxColor)
      setSessionNotice(null)
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
      setSessionNotice('Platform size cleared — use Resize before Export.')
      setLastCropBoxPx(cropRequest?.pixels || null)
    } catch (err) {
      console.error('Error applying crop in container:', err)
      setExportError('Could not process the cropped image.')
      throw err
    }
  }, [applyTransformedImage, effectiveBackendMediaId, resetExportSessionState])

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
    setSessionNotice(null)
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

  return {
    selectedPreset,
    latestExportResult,
    lastExportLetterbox,
    letterboxColor,
    setLetterboxColor,
    isExporting,
    exportError,
    sessionNotice,
    lastCropBoxPx,
    effectiveBackendResult,
    effectiveBackendMediaId,
    effectiveImageSrc,
    resetExportSessionState,
    resetImageEditingSessionState,
    clearCropSession,
    handleSizeSelect,
    handleCropApply,
    handleAddTextApply,
    handleExport,
    resetPresetExportSettings,
    invalidateLatestExport,
  }
}

export default useImageEditingSession