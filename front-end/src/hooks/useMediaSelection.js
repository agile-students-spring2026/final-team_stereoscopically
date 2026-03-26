import { useCallback, useEffect, useMemo, useState } from 'react'
import usePixabayMedia from './usePixabayMedia'
import { derivePreviewUrl, deriveSourceUrl } from '../services/mediaSelection'

const normalizeType = (type) => {
  if (type === 'video' || type === 'gif') return 'video'
  return 'image'
}

const useMediaSelection = (preferredMockMediaType = 'image', options = {}) => {
  const { autoBootstrap = false } = options
  const normalizedPreference = useMemo(() => normalizeType(preferredMockMediaType), [preferredMockMediaType])
  const [mediaType, setMediaType] = useState(null)
  const [selectedMedia, setSelectedMedia] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [sourceUrl, setSourceUrl] = useState(null)
  const [selectionError, setSelectionError] = useState(null)
  const [isBootstrapLoading, setIsBootstrapLoading] = useState(false)

  const imageApi = usePixabayMedia('image', { auto: false })
  const videoApi = usePixabayMedia('video', { auto: false })

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

  const applyVideoSelection = useCallback((mediaItem) => {
    if (!mediaItem) return false
    setMediaType('video')
    setSelectedMedia(mediaItem)
    setPreviewUrl(null)
    setSourceUrl(null)
    return true
  }, [])

  const fetchInitialImage = useCallback(() => {
    return imageApi.fetchAndSelect(({ item, previewUrl, sourceUrl }) =>
      applyImageSelection(item, { previewUrl, sourceUrl })
    )
  }, [applyImageSelection, imageApi])

  const fetchInitialVideo = useCallback(() => {
    return videoApi.fetchAndSelect(({ item }) => applyVideoSelection(item))
  }, [applyVideoSelection, videoApi])

  const bootstrapInitialSelection = useCallback(async () => {
    setIsBootstrapLoading(true)
    setSelectionError(null)

    try {
      const attempts =
        normalizedPreference === 'video'
          ? [fetchInitialVideo, fetchInitialImage]
          : [fetchInitialImage, fetchInitialVideo]

      for (const attempt of attempts) {
        const applied = await attempt()
        if (applied) {
          return true
        }
      }

      setSelectionError('Unable to load media from Pixabay right now. Please try again later.')
      return false
    } catch (error) {
      console.error('[useMediaSelection] Unable to load Pixabay media', error)
      setSelectionError('Unable to load media from Pixabay right now. Please try again later.')
      return false
    } finally {
      setIsBootstrapLoading(false)
    }
  }, [fetchInitialImage, fetchInitialVideo, normalizedPreference])

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

  const selectVideo = useCallback(async () => {
    setSelectionError(null)
    const applied = await videoApi.fetchAndSelect(({ item }) => applyVideoSelection(item))

    if (!applied) {
      setSelectionError('Unable to select video media right now. Please try again.')
    }

    return applied
  }, [applyVideoSelection, videoApi])

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

  const isSelectionLoading = isBootstrapLoading || imageApi.isLoading || videoApi.isLoading
  const combinedError = selectionError || imageApi.error?.message || videoApi.error?.message || null

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
