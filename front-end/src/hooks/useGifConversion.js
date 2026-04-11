import { useCallback } from 'react'
import { trimVideoService } from '../services/backendGifService'

const useGifConversion = () => {
  const createGif = useCallback(async (videoFile, trimStart, trimEnd) => {
    return trimVideoService(videoFile, trimStart, trimEnd)
  }, [])

  return {
    createGif,
  }
}

export default useGifConversion