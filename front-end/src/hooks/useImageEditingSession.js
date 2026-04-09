import { useCallback, useEffect, useState } from 'react'
import {
  addTextToImageFromBackend,
  convertBackendImageResultToLocalMedia,
  cropImageFromBackend,
  exportImageFromBackend,
} from '../services/backendImageService'

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
  const [originalBackendMediaId, setOriginalBackendMediaId] = useState(null)
  const [lastCropBoxPx, setLastCropBoxPx] = useState(null)

  const effectiveBackendResult = latestExportResult?.id ? latestExportResult : backendImageResult
  const effectiveBackendMediaId = effectiveBackendResult?.id || null
  const effectiveImageSrc = previewUrl || effectiveBackendResult?.url || null

  useEffect(() => {
    if (mediaType !== 'image') return
    if (originalBackendMediaId) return
    if (!backendImageResult?.id) return

    setOriginalBackendMediaId(backendImageResult.id)
  }, [mediaType, originalBackendMediaId, backendImageResult])

  const resetExportSessionState = useCallback(() => {
    setSelectedPreset(null)
    setLatestExportResult(null)
    setLastExportLetterbox(null)
    setLetterboxColor('transparent')
    setExportError(null)
  }, [])

  const resetImageEditingSessionState = useCallback(() => {
    resetExportSessionState()
    setOriginalBackendMediaId(null)
    setLastCropBoxPx(null)
  }, [resetExportSessionState])

  const clearCropSession = useCallback(() => {
    setLastCropBoxPx(null)
  }, [])

  const handleSizeSelect = useCallback(async (size) => {
    if (!effectiveBackendMediaId) {
      setExportError('Image is not ready for backend export yet. Please re-upload and try again.')
      return false
    }

    try {
      setIsExporting(true)
      setExportError(null)

      const exported = await exportImageFromBackend({
        mediaId: effectiveBackendMediaId,
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
      setSelectedPreset(size)
      setLatestExportResult(exported)
      setLastExportLetterbox(letterboxColor)
      return true
    } catch (err) {
      console.error('Preset export failed:', err)
      setExportError(err?.message || 'Failed to export image at the selected size.')
      return false
    } finally {
      setIsExporting(false)
    }
  }, [applyTransformedImage, effectiveBackendMediaId, letterboxColor, previewUrl, sourceUrl])

  const handleCropApply = useCallback(async (cropRequest) => {
    const cropSourceMediaId = originalBackendMediaId || effectiveBackendMediaId
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
      setLatestExportResult(null)
      setLastExportLetterbox(null)
      setLastCropBoxPx(cropRequest?.pixels || null)
    } catch (err) {
      console.error('Error applying crop in container:', err)
      setExportError('Could not process the cropped image.')
      throw err
    }
  }, [applyTransformedImage, effectiveBackendMediaId, originalBackendMediaId])

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
    if (!effectiveBackendMediaId) {
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
              mediaId: effectiveBackendMediaId,
              width: selectedPreset.width,
              height: selectedPreset.height,
              letterboxColor,
            })

      setLatestExportResult(exported)
      setLastExportLetterbox(letterboxColor)
      const link = document.createElement('a')
      link.href = exported.downloadUrl || exported.url
      link.download = exported.fileName || 'sticker.png'
      document.body.appendChild(link)
      link.click()
      link.remove()
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

  return {
    selectedPreset,
    latestExportResult,
    lastExportLetterbox,
    letterboxColor,
    setLetterboxColor,
    isExporting,
    exportError,
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
  }
}

export default useImageEditingSession