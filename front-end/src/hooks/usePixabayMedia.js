import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchPixabayImages, fetchPixabayVideos } from '../services/pixabayService'
import { derivePreviewUrl, deriveSourceUrl } from '../services/mediaSelection'

const getFetcherByType = (type) => (type === 'video' ? fetchPixabayVideos : fetchPixabayImages)

const buildError = (message, details) => {
  const error = new Error(message)
  if (details) {
    error.details = details
  }
  return error
}

const usePixabayMedia = (type = 'image', options = {}) => {
  const { query, auto = false, params = {} } = options
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(auto)
  const [error, setError] = useState(null)
  const requestIdRef = useRef(0)
  const fetcherRef = useRef(getFetcherByType(type))

  useEffect(() => {
    fetcherRef.current = getFetcherByType(type)
  }, [type])

  const loadMedia = useCallback(
    async (overrideQuery, overrideParams = {}) => {
      const fetcher = fetcherRef.current
      const requestId = Date.now()
      requestIdRef.current = requestId
      setIsLoading(true)
      setError(null)

      try {
        const results = await fetcher(overrideQuery ?? query, {
          ...params,
          ...overrideParams,
        })

        if (requestIdRef.current !== requestId) {
          return results ?? []
        }

        setItems(results)

        if (!results?.length) {
          setError(buildError('No media found for that query.'))
        }

        return results ?? []
      } catch (err) {
        if (requestIdRef.current === requestId) {
          setItems([])
          setError(
            err instanceof Error ? err : buildError('Failed to load media.', { cause: err ?? null })
          )
        }

        return []
      } finally {
        if (requestIdRef.current === requestId) {
          setIsLoading(false)
        }
      }
    },
    [params, query]
  )

  useEffect(() => {
    if (!auto) return undefined

    loadMedia(query, params)

    return () => {
      requestIdRef.current += 1
    }
  }, [auto, loadMedia, params, query])

  const fetchAndSelect = useCallback(
    async (applySelection) => {
      setIsLoading(true)
      setError(null)

      try {
        const mediaItems = await loadMedia()

        if (!mediaItems?.length) {
          setError(buildError('No media available from Pixabay right now.'))
          return false
        }

        if (!applySelection) {
          return false
        }

        const randomIndex = Math.floor(Math.random() * mediaItems.length)
        const chosenItem = mediaItems[randomIndex]
        const previewUrl = derivePreviewUrl(chosenItem)
        const sourceUrl = deriveSourceUrl(chosenItem, null, previewUrl)

        if (!previewUrl) {
          setError(buildError('Selected media is missing a preview URL.'))
          return false
        }

        const applied = applySelection({
          item: { ...chosenItem, isApi: true },
          previewUrl,
          sourceUrl,
          type,
        })

        if (!applied) {
          setError(buildError('Unable to apply the selected Pixabay media.'))
        }

        return applied
      } finally {
        setIsLoading(false)
      }
    },
    [loadMedia, type]
  )

  return {
    items,
    isLoading,
    error,
    hasResults: items.length > 0,
    refetch: loadMedia,
    fetchAndSelect,
  }
}

export default usePixabayMedia
