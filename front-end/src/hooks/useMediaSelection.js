import { useCallback, useEffect, useMemo, useState } from 'react'
import usePixabayMedia from './usePixabayMedia'
import { resolveMockMediaSelection } from '../services/mockMediaService'
import { derivePreviewUrl, deriveSourceUrl } from '../services/mediaSelection'

const normalizeType = (type) => {
  if (type === 'video' || type === 'gif') return 'video'
  return 'image'
}

const useMediaSelection = (preferredMockMediaType = 'image') => {
  const normalizedPreference = useMemo(() => normalizeType(preferredMockMediaType), [preferredMockMediaType])
  const [mediaType, setMediaType] = useState(null)
  const [selectedMedia, setSelectedMedia] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [sourceUrl, setSourceUrl] = useState(null)
  const [selectionError, setSelectionError] = useState(null)
  const [isMockLoading, setIsMockLoading] = useState(false)

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

  const bootstrapMockSelection = useCallback(async () => {
    setIsMockLoading(true)
    setSelectionError(null)

    try {
      const result = await resolveMockMediaSelection(normalizedPreference)

      if (result.error) {
        setSelectionError(result.error)
        return false
      }

      if (result.fileType === 'video') {
        return applyVideoSelection(result.selectedFile)
      }

      return applyImageSelection(result.selectedFile, {
        previewUrl: result.previewUrl,
        sourceUrl: result.sourceUrl,
      })
    } catch (error) {
      console.error('[useMediaSelection] Unable to load mock media', error)
      setSelectionError('Failed to load sample media. Please try uploading your own file instead.')
      return false
    } finally {
      setIsMockLoading(false)
    }
  }, [applyImageSelection, applyVideoSelection, normalizedPreference])

  useEffect(() => {
    if (selectedMedia) return undefined

    let cancelled = false

    const loadMock = async () => {
      const applied = await bootstrapMockSelection()
      if (!applied && !cancelled) {
        setSelectionError((prev) => prev ?? 'Unable to prepare sample media. Please try again later.')
      }
    }

    loadMock()

    return () => {
      cancelled = true
    }
  }, [bootstrapMockSelection, selectedMedia])

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

  const isSelectionLoading = isMockLoading || imageApi.isLoading || videoApi.isLoading
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
