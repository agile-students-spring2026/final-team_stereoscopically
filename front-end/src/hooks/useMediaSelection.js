import { useCallback, useEffect, useState } from 'react'
import usePixabayMedia from './usePixabayMedia'
import { derivePreviewUrl, deriveSourceUrl } from '../services/mediaSelection'

const useMediaSelection = (options = {}) => {
  const { autoBootstrap = false } = options
  const [mediaType, setMediaType] = useState(null)
  const [selectedMedia, setSelectedMedia] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [sourceUrl, setSourceUrl] = useState(null)
  const [selectionError, setSelectionError] = useState(null)
  const [isBootstrapLoading, setIsBootstrapLoading] = useState(false)

  const imageApi = usePixabayMedia('image', { auto: false })

  const applyImageSelection = useCallback((mediaItem, options = {}) => {
    if (!mediaItem) return false
    const preview = derivePreviewUrl(mediaItem, options.previewUrl)
    const source = deriveSourceUrl(mediaItem, options.sourceUrl, preview)

    if (!preview) return false

    setMediaType('image')
    setSelectedMedia(mediaItem)
    setPreviewUrl(preview)
    setSourceUrl(source)
    return true
  }, [])

  const applyVideoSelection = useCallback((file) => {
    if (!file) return false
    setMediaType('video')
    setSelectedMedia(file)
    setPreviewUrl(null)
    setSourceUrl(null)
    return true
  }, [])

  const fetchInitialImage = useCallback(() => {
    return imageApi.fetchAndSelect(({ item, previewUrl, sourceUrl }) =>
      applyImageSelection(item, { previewUrl, sourceUrl })
    )
  }, [applyImageSelection, imageApi])



  // Only bootstrap images from API now
  const bootstrapInitialSelection = useCallback(async () => {
    setIsBootstrapLoading(true)
    setSelectionError(null)

    try {
      const applied = await fetchInitialImage()
      if (applied) {
        return true
      }
      setSelectionError('Unable to load image media from Pixabay right now. Please try again later.')
      return false
    } catch (error) {
      console.error('[useMediaSelection] Unable to load Pixabay image media', error)
      setSelectionError('Unable to load image media from Pixabay right now. Please try again later.')
      return false
    } finally {
      setIsBootstrapLoading(false)
    }
  }, [fetchInitialImage])

  useEffect(() => {
    if (!autoBootstrap) return undefined
    if (selectedMedia) return undefined

    let cancelled = false

    const loadInitial = async () => {
      const applied = await bootstrapInitialSelection()
      if (!applied && !cancelled) {
        setSelectionError((prev) => prev ?? 'Unable to prepare media. Please try again later.')
      }
    }

    loadInitial()

    return () => {
      cancelled = true
    }
  }, [autoBootstrap, bootstrapInitialSelection, selectedMedia])

  const selectImage = useCallback(async () => {
    setSelectionError(null)
    const applied = await imageApi.fetchAndSelect(({ item, previewUrl, sourceUrl }) =>
      applyImageSelection(item, { previewUrl, sourceUrl })
    )

    if (!applied) {
      setSelectionError('Unable to select image media right now. Please try again.')
    }

    return applied
  }, [applyImageSelection, imageApi])

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
  }, [])

  const applyTransformedImage = useCallback((file, nextPreviewUrl) => {
    if (!file || !nextPreviewUrl) return false

    setMediaType('image')
    setSelectedMedia(file)
    setPreviewUrl(nextPreviewUrl)
    // Leave sourceUrl untouched so resizes continue to use the original source
    return true
  }, [])

  const isSelectionLoading = isBootstrapLoading || imageApi.isLoading
  const combinedError = selectionError || imageApi.error?.message || null

  return {
    mediaType,
    selectedMedia,
    previewUrl,
    sourceUrl,
    isLoading: isSelectionLoading,
    error: combinedError,
    selectImage,
    selectVideo,
    resetSelection,
    applyTransformedImage,
  }
}

export default useMediaSelection
