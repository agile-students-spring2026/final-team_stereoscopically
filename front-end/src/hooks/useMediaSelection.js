import { useCallback, useState } from 'react'
import { uploadImageToBackend } from '../services/backendImageService'

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
      return false
    }

    if (!file.type?.startsWith('image/')) {
      setValidationError('Please select an image file.')
      return false
    }

    const maxImageSizeBytes = 50 * 1024 * 1024
    if (file.size > maxImageSizeBytes) {
      setValidationError('File is too large (max 50 MB).')
      return false
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
      return true
    } catch (error) {
      console.error('[useMediaSelection] Unable to upload image to backend', error)
      setUploadError(error?.message || 'Image upload failed. Please try again.')
      return true
    } finally {
      setIsUploading(false)
    }
  }, [])

  // selectVideo now expects a File (user input)
  const selectVideo = useCallback((file) => {
    setSelectionError(null)
    const applied = applyVideoSelection(file)
    if (!applied) {
      setSelectionError('Unable to select video file. Please try again.')
    }
    return applied
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

  const applyTransformedImage = useCallback((file, nextPreviewUrl) => {
    if (!file || !nextPreviewUrl) return false

    setMediaType('image')
    setSelectedMedia(file)
    setPreviewUrl(nextPreviewUrl)
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
