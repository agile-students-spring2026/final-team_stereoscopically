import { useCallback, useState } from 'react'
import { uploadImageToBackend } from '../services/backendImageService'
import { isVideoTypeSupported } from '../utils/videoSupport'

const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024

export const MEDIA_SELECTION_CODES = {
  OK: 'OK',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_IMAGE: 'UNSUPPORTED_IMAGE',
  UNSUPPORTED_VIDEO: 'UNSUPPORTED_VIDEO',
  INVALID_IMAGE: 'INVALID_IMAGE',
  INVALID_VIDEO: 'INVALID_VIDEO',
  EMPTY_FILE: 'EMPTY_FILE',
  APPLY_FAILED: 'APPLY_FAILED',
}

const isHeicFile = (file) => {
  if (!file) return false
  const lowerName = file.name?.toLowerCase() || ''
  const lowerType = file.type?.toLowerCase() || ''

  return (
    lowerName.endsWith('.heic') ||
    lowerName.endsWith('.heif') ||
    lowerType === 'image/heic' ||
    lowerType === 'image/heif'
  )
}

const useMediaSelection = () => {
  const [mediaType, setMediaType] = useState(null)
  const [selectedMedia, setSelectedMedia] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [sourceUrl, setSourceUrl] = useState(null)
  const [selectionError, setSelectionError] = useState(null)
  const [backendImageResult, setBackendImageResult] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [validationError, setValidationError] = useState(null)
  

  const applyVideoSelection = useCallback((file) => {
    if (!file) return false
    setMediaType('video')
    setSelectedMedia(file)
    setPreviewUrl(null)
    setSourceUrl(null)
    return true
  }, [])

  const selectImage = useCallback(async (file) => {
    setSelectionError(null)
    setValidationError(null)
    setUploadError(null)
    setBackendImageResult(null)

    if (!file) {
      setValidationError('Please select an image file.')
      return { applied: false, code: MEDIA_SELECTION_CODES.EMPTY_FILE }
    }

    if (isHeicFile(file)) {
      return { applied: false, code: MEDIA_SELECTION_CODES.UNSUPPORTED_IMAGE }
    }

    if (!file.type?.startsWith('image/')) {
      setValidationError('Please select an image file.')
      return { applied: false, code: MEDIA_SELECTION_CODES.INVALID_IMAGE }
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return { applied: false, code: MEDIA_SELECTION_CODES.FILE_TOO_LARGE }
    }

    const localPreviewUrl = URL.createObjectURL(file)
    setMediaType('image')
    setSelectedMedia(file)
    setPreviewUrl(localPreviewUrl)
    setSourceUrl(localPreviewUrl)

    setIsUploading(true)
    try {
      const uploadedMedia = await uploadImageToBackend(file)
      setBackendImageResult(uploadedMedia)
      return { applied: true, code: MEDIA_SELECTION_CODES.OK }
    } catch (error) {
      console.error('[useMediaSelection] Unable to upload image to backend', error)
      setUploadError(error?.message || 'Image upload failed. Please try again.')
      return { applied: true, code: MEDIA_SELECTION_CODES.OK }
    } finally {
      setIsUploading(false)
    }
  }, [])

  // selectVideo now expects a File (user input)
  const selectVideo = useCallback((file) => {
    setSelectionError(null)
    setValidationError(null)

    if (!file) {
      setSelectionError('Unable to select video file. Please try again.')
      return { applied: false, code: MEDIA_SELECTION_CODES.EMPTY_FILE }
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return { applied: false, code: MEDIA_SELECTION_CODES.FILE_TOO_LARGE }
    }

    if (!isVideoTypeSupported(file)) {
      return { applied: false, code: MEDIA_SELECTION_CODES.UNSUPPORTED_VIDEO }
    }

    const applied = applyVideoSelection(file)
    if (!applied) {
      setSelectionError('Unable to select video file. Please try again.')
      return { applied: false, code: MEDIA_SELECTION_CODES.APPLY_FAILED }
    }
    return { applied: true, code: MEDIA_SELECTION_CODES.OK }
  }, [applyVideoSelection])

  const resetSelection = useCallback(() => {
    setMediaType(null)
    setSelectedMedia(null)
    setPreviewUrl(null)
    setSourceUrl(null)
    setSelectionError(null)
    setBackendImageResult(null)
    setIsUploading(false)
    setUploadError(null)
    setValidationError(null)
  }, [])

  const applyTransformedImage = useCallback((file, nextPreviewUrl, nextBackendResult) => {
    if (!file || !nextPreviewUrl) return false

    setMediaType('image')
    setSelectedMedia(file)
    setPreviewUrl(nextPreviewUrl)
    if (nextBackendResult) setBackendImageResult(nextBackendResult)
    // Leave sourceUrl untouched so resizes continue to use the original source
    return true
  }, [])

  const combinedError = validationError || uploadError || selectionError || null

  return {
    mediaType,
    selectedMedia,
    previewUrl,
    sourceUrl,
    backendImageResult,
    isUploading,
    uploadError,
    validationError,
    selectionError,
    isLoading: false,
    error: combinedError,
    selectImage,
    selectVideo,
    resetSelection,
    applyTransformedImage,
  }
}

export default useMediaSelection
