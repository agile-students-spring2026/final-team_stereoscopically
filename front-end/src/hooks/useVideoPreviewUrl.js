import { useEffect, useMemo } from 'react'

export const resolveVideoMediaUrl = (mediaValue) => {
  if (!mediaValue) return null
  if (typeof mediaValue === 'string') return mediaValue
  if (typeof mediaValue === 'object') {
    return mediaValue.url || mediaValue.src || mediaValue.source || mediaValue.fullUrl || null
  }
  return null
}

function useVideoPreviewUrl(videoFile, options = {}) {
  const { revokeInProdOnly = true, onObjectUrlError } = options

  const videoUrl = useMemo(() => {
    if (!videoFile) return null

    if (videoFile instanceof File) {
      try {
        return URL.createObjectURL(videoFile)
      } catch (error) {
        onObjectUrlError?.(error)
        return null
      }
    }

    return resolveVideoMediaUrl(videoFile)
  }, [onObjectUrlError, videoFile])

  useEffect(() => {
    if (!(videoFile instanceof File) || !videoUrl) return

    return () => {
      if (!revokeInProdOnly || import.meta.env.PROD) {
        URL.revokeObjectURL(videoUrl)
      }
    }
  }, [revokeInProdOnly, videoFile, videoUrl])

  return videoUrl
}

export default useVideoPreviewUrl
