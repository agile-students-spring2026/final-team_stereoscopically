import { useEffect, useMemo, useState } from 'react'
import CreateNew from './CreateNew'
import ImageEditor from './ImageEditor'
import FilterMain from './FilterMain'
import PresetFilters from './PresetFilters'
import PresetSizes from './PresetSizes'
import AddText from './AddText'
import ColorFilters from './ColorFilters'
import GifEditor from './GifEditor'
import { resolveMockMediaSelection } from '../services/mockMediaService'

const getPreferredMockMediaType = () => {
  if (typeof window === 'undefined') return 'image'
  const params = new URLSearchParams(window.location.search)
  const mediaParam = params.get('media')?.toLowerCase()

  if (mediaParam === 'video' || mediaParam === 'gif') {
    return 'video'
  }

  if (mediaParam === 'image' || mediaParam === 'photo') {
    return 'image'
  }

  return 'image'
}

function resizeImageToDimensions(imageUrl, targetWidth, targetHeight, preserveAspect = false) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = targetWidth
      canvas.height = targetHeight
      const ctx = canvas.getContext('2d')
      // Enable high-quality image rendering
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      // Fill background with white for letterboxing
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, targetWidth, targetHeight)

      const imgAspect = img.width / img.height
      const targetAspect = targetWidth / targetHeight
      let sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight

      if (preserveAspect) {
        // Letterbox mode: fit entire image without cropping
        sWidth = img.width
        sHeight = img.height
        sx = 0
        sy = 0

        if (imgAspect > targetAspect) {
          // Image is wider, fit to width
          dWidth = targetWidth
          dHeight = targetWidth / imgAspect
          dx = 0
          dy = (targetHeight - dHeight) / 2
        } else {
          // Image is taller, fit to height
          dHeight = targetHeight
          dWidth = targetHeight * imgAspect
          dx = (targetWidth - dWidth) / 2
          dy = 0
        }
      } else {
        // Crop and fit mode: fill entire canvas, may crop image
        if (imgAspect > targetAspect) {
          sHeight = img.height
          sWidth = img.height * targetAspect
          sx = (img.width - sWidth) / 2
          sy = 0
        } else {
          sWidth = img.width
          sHeight = img.width / targetAspect
          sx = 0
          sy = (img.height - sHeight) / 2
        }
        dx = 0
        dy = 0
        dWidth = targetWidth
        dHeight = targetHeight
      }

      // Draw with high quality
      ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)

      // Use PNG format for lossless quality
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], 'sticker.png', { type: 'image/png' })
            resolve({ file, url: URL.createObjectURL(blob) })
          } else reject(new Error('Failed to create blob'))
        },
        'image/png'
      )
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = imageUrl
  })
}

function EditorContainer() {
  const preferredMockMediaType = useMemo(() => getPreferredMockMediaType(), [])
  const [fileType, setFileType] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)

  const [imagePreviewUrl, setImagePreviewUrl] = useState(null)
  // Keep original image URL to always resize from original
  const [originalImageUrl, setOriginalImageUrl] = useState(null)
  const [filterScreen, setFilterScreen] = useState('filters-main')
  const [isMockLoading, setIsMockLoading] = useState(false)
  const [mockError, setMockError] = useState(null)

  useEffect(() => {
    if (selectedFile) return

    let isCancelled = false

    const loadMockMedia = async () => {
      setIsMockLoading(true)
      setMockError(null)

      try {
        const result = await resolveMockMediaSelection(preferredMockMediaType)
        if (isCancelled) return

        if (result.error) {
          setMockError(result.error)
          return
        }

        setFileType(result.fileType)
        setSelectedFile(result.selectedFile)

        if (result.fileType === 'image') {
          setImagePreviewUrl(result.previewUrl || null)
          setOriginalImageUrl(result.sourceUrl || result.previewUrl || null)
          setFilterScreen('editor')
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('[EditorContainer] Unable to load mock media', error)
          setMockError('Failed to load sample media. Please try uploading your own file instead.')
        }
      } finally {
        if (!isCancelled) {
          setIsMockLoading(false)
        }
      }
    }

    loadMockMedia()

    return () => {
      isCancelled = true
    }
  }, [selectedFile, preferredMockMediaType])

  const handleImageSelect = (file) => {
    setFileType('image')
    setSelectedFile(file)
    const preview = URL.createObjectURL(file)
    setImagePreviewUrl(preview)
    setOriginalImageUrl(preview)
    setFilterScreen('editor')
    console.log('Image stored in App:', file)
  }

  const handleVideoSelect = (file) => {
    setFileType('video')
    setSelectedFile(file)
  }

  const handleBackToUpload = () => {
    setSelectedFile(null)
    setFileType(null)
    setImagePreviewUrl(null)
    setOriginalImageUrl(null)
    setFilterScreen('editor')
  }

  const handleOpenFilters = () => {
    setFilterScreen('filters-main')
  }

  const handleApplyFilters = (data) => {
    console.log('Apply filters data:', data)
    setFilterScreen('editor')
  }

  const handleOpenSizes = () => {
    setFilterScreen('preset-sizes')
  }
  const handleExportImage = () => {
    if(!imagePreviewUrl) return

    const link = document.createElement('a')
    link.href = imagePreviewUrl
    link.download = 'sticker.png'
    link.click()
  }

  const handleSizeSelect = async (size) => {
    if (!size.width || !size.height) {
      setFilterScreen('editor')
      return
    }
    // Always resize from the original image, not the preview
    if (!originalImageUrl) {
      setFilterScreen('editor')
      return
    }
    try {
      // Use letterbox (preserveAspect) for Discord sticker to avoid cropping
      const shouldPreserveAspect = size.id === 'discord-sticker'
      const { file, url } = await resizeImageToDimensions(
        originalImageUrl,
        size.width,
        size.height,
        shouldPreserveAspect
      )
      // Revoke old preview URL if it's different from original
      if (imagePreviewUrl && imagePreviewUrl !== originalImageUrl) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
      setSelectedFile(file)
      setImagePreviewUrl(url)
    } catch (err) {
      console.error('Resize failed:', err)
    }
    setFilterScreen('editor')
  }

  const renderContent = () => {
    if (!selectedFile) {
      if (isMockLoading) {
        return (
          <div className="card" role="status">
            <p>Loading sample media...</p>
          </div>
        )
      }

      if (mockError) {
        return (
          <CreateNew
            onImageSelect={handleImageSelect}
            onVideoSelect={handleVideoSelect}
          />
        )
      }

      return null
    }

    if (fileType === 'video'){
      return (
        <GifEditor
          videoFile={selectedFile}
          onCancel={handleBackToUpload}
        />
      )
    }

    switch (filterScreen) {
      case 'editor':
        return (
          <ImageEditor
            imageSrc={imagePreviewUrl}
            onBack={handleBackToUpload}
            onOpenFilters={handleOpenFilters}
            onOpenSizes={handleOpenSizes}
            onApplyCustomSize={handleSizeSelect}
            onExport={handleExportImage}
          />
        )
      case 'filters-main':
        return (
          <FilterMain
            onPresetFilters={() => setFilterScreen('preset')}
            onAddText={() => setFilterScreen('text')}
            onColorFilters={() => setFilterScreen('color')}
          />
        )
      case 'preset':
        return (
          <PresetFilters
            imageSrc={imagePreviewUrl}
            onApply={handleApplyFilters}
            onCancel={() => setFilterScreen('editor')}
          />
        )
      case 'text':
        return (
          <AddText
            imageSrc={imagePreviewUrl}
            onApply={handleApplyFilters}
            onCancel={() => setFilterScreen('editor')}
          />
        )
      case 'color':
        return (
          <ColorFilters
            imageSrc={imagePreviewUrl}
            onApply={handleApplyFilters}
            onCancel={() => setFilterScreen('editor')}
          />
        )
      case 'preset-sizes':
        return (
          <PresetSizes
            onSelect={handleSizeSelect}
            onCancel={() => setFilterScreen('editor')}
          />
        )
      default:
        return (
          <ImageEditor
            imageSrc={imagePreviewUrl}
            onBack={handleBackToUpload}
            onOpenFilters={handleOpenFilters}
            onOpenSizes={handleOpenSizes}
            onApplyCustomSize={handleSizeSelect}
            onExport={handleExportImage}
          />
        )
    }
  }

  return renderContent()
}

export default EditorContainer
