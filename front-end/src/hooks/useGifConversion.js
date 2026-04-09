import { useCallback } from 'react'
import { convertVideoToGif } from '../services/backendGifService'

const useGifConversion = () => {
  const createGif = useCallback(async (videoFile) => {
    return convertVideoToGif(videoFile)
  }, [])

  return {
    createGif,
  }
}

export default useGifConversion