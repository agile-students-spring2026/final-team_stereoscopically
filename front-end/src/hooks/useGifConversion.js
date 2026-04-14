import { useCallback, useState } from 'react'
import { trimVideoService, exportGifToBackend } from '../services/backendGifService'

const useGifConversion = () => {
  const [isProcessing, setIsProcessing] = useState(false)

  const createGif = useCallback(async (videoFile, trimStart, trimEnd) => {
    return trimVideoService(videoFile, trimStart, trimEnd)
  }, [])

  const exportGif = useCallback(async (mediaId) => {
    setIsProcessing(true)
    try {
      const result = await exportGifToBackend(mediaId)
      if (result?.downloadUrl) {
        const a = document.createElement('a')
        a.href = result.downloadUrl
        a.download = 'output.gif'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
      return result
    } finally {
      setIsProcessing(false)
    }
  }, [])

  return {
    isProcessing,
    createGif,
    exportGif,
  }
}

export default useGifConversion