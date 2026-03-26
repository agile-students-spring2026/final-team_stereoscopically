import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchPixabayImages, fetchPixabayVideos } from '../services/pixabayService'
import { resolveMockMediaSelection } from '../services/mockMediaService'
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

      const mediaItems = await loadMedia()
      let applied = false

      if (mediaItems?.length && applySelection) {
        const firstItem = mediaItems[0]
        const previewUrl = derivePreviewUrl(firstItem)
        const sourceUrl = deriveSourceUrl(firstItem, null, previewUrl)
        applied = applySelection({
          item: { ...firstItem, isApi: true },
          previewUrl,
          sourceUrl,
          type,
        })
      }

      if (!applied && applySelection) {
        const fallback = await resolveMockMediaSelection(type)
        if (!fallback.error && fallback.selectedFile) {
          applied = applySelection({
            item: fallback.selectedFile,
            previewUrl: fallback.previewUrl,
            sourceUrl: fallback.sourceUrl,
            type: fallback.fileType,
          })
        } else if (fallback.error) {
          setError(new Error(fallback.error))
        }
      }

      setIsLoading(false)
      return applied
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
