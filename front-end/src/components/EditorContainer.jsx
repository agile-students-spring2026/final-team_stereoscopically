import { useCallback, useEffect, useMemo, useState } from 'react'
import CreateNew from './CreateNew'
import ImageEditor from './ImageEditor'
import FilterMain from './FilterMain'
import PresetFilters from './PresetFilters'
import PresetSizes from './PresetSizes'
import AddText from './AddText'
import ColorFilters from './ColorFilters'
import GifEditor from './GifEditor'
import { resolveMockMediaSelection } from '../services/mockMediaService'
import usePixabayMedia from '../hooks/usePixabayMedia'
import { derivePreviewUrl, deriveSourceUrl } from '../services/mediaSelection'

const SCREENS = {
  EDITOR: 'editor',
  FILTERS_MAIN: 'filters-main',
  PRESET_FILTERS: 'preset',
  ADD_TEXT: 'text',
  COLOR_FILTERS: 'color',
  PRESET_SIZES: 'preset-sizes',
}

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
  const [mediaType, setMediaType] = useState(null)
  const [selectedMedia, setSelectedMedia] = useState(null)

  const [previewUrl, setPreviewUrl] = useState(null)
  // Keep original image URL to always resize from original
  const [sourceUrl, setSourceUrl] = useState(null)
  const [screen, setScreen] = useState(SCREENS.FILTERS_MAIN)
  const [isMockLoading, setIsMockLoading] = useState(false)
  const [mockError, setMockError] = useState(null)
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
    setScreen(SCREENS.EDITOR)
    return true
  }, [])

  const applyVideoSelection = useCallback((mediaItem) => {
    if (!mediaItem) return false
    setMediaType('video')
    setSelectedMedia(mediaItem)
    setPreviewUrl(null)
    setSourceUrl(null)
    setScreen(SCREENS.EDITOR)
    return true
  }, [])

  useEffect(() => {
    if (selectedMedia) return

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

        const applied =
          result.fileType === 'video'
            ? applyVideoSelection(result.selectedFile)
            : applyImageSelection(result.selectedFile, {
                previewUrl: result.previewUrl,
                sourceUrl: result.sourceUrl,
              })

        if (!applied) {
          setMockError('Unable to prepare sample media. Please try again later.')
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
  }, [selectedMedia, preferredMockMediaType, applyImageSelection, applyVideoSelection])

  const handleImageSelect = async () => {
    setMockError(null)

    await imageApi.fetchAndSelect(({ item, previewUrl, sourceUrl }) =>
      applyImageSelection(item, { previewUrl, sourceUrl })
    )
  }

  const handleVideoSelect = async () => {
    setMockError(null)

    await videoApi.fetchAndSelect(({ item }) => applyVideoSelection(item))
  }

  const handleBackToUpload = () => {
    setSelectedMedia(null)
    setMediaType(null)
    setPreviewUrl(null)
    setSourceUrl(null)
    setScreen(SCREENS.EDITOR)
  }

  const handleOpenFilters = () => {
    setScreen(SCREENS.FILTERS_MAIN)
  }

  const handleApplyFilters = () => {
    setScreen(SCREENS.EDITOR)
  }

  const handleOpenSizes = () => {
    setFilterScreen('preset-sizes')
  }

  const handleSizeSelect = async (size) => {
    if (!size.width || !size.height) {
      setScreen(SCREENS.EDITOR)
      return
    }
    // Always resize from the original image, not the preview
    if (!sourceUrl) {
      setScreen(SCREENS.EDITOR)
      return
    }
    try {
      // Use letterbox (preserveAspect) for Discord sticker to avoid cropping
      const shouldPreserveAspect = size.id === 'discord-sticker'
      const { file, url } = await resizeImageToDimensions(
        sourceUrl,
        size.width,
        size.height,
        shouldPreserveAspect
      )
      // Revoke old preview URL if it's different from original
      if (previewUrl && previewUrl !== sourceUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      setSelectedMedia(file)
      setPreviewUrl(url)
    } catch (err) {
      console.error('Resize failed:', err)
    }
    setScreen(SCREENS.EDITOR)
  }

  const renderContent = () => {
    const isSelectionLoading = isMockLoading || imageApi.isLoading || videoApi.isLoading
    const selectionError = mockError || imageApi.error?.message || videoApi.error?.message || null

    if (!selectedMedia) {
      if (isSelectionLoading) {
        return (
          <div className="card" role="status">
            <p>Loading sample media...</p>
          </div>
        )
      }

      if (selectionError) {
        return (
          <CreateNew
            onImageSelect={handleImageSelect}
            onVideoSelect={handleVideoSelect}
          />
        )
      }

      return null
    }

    if (mediaType === 'video'){
      return (
        <GifEditor
          videoFile={selectedMedia}
          onCancel={handleBackToUpload}
        />
      )
    }

    switch (screen) {
      case SCREENS.EDITOR:
        return (
          <ImageEditor
            imageSrc={previewUrl}
            onBack={handleBackToUpload}
            onOpenFilters={handleOpenFilters}
            onSize={handleOpenSizes}
          />
        )
      case SCREENS.FILTERS_MAIN:
        return (
          <FilterMain
            onPresetFilters={() => setScreen(SCREENS.PRESET_FILTERS)}
            onAddText={() => setScreen(SCREENS.ADD_TEXT)}
            onColorFilters={() => setScreen(SCREENS.COLOR_FILTERS)}
          />
        )
      case SCREENS.PRESET_FILTERS:
        return (
          <PresetFilters
            imageSrc={previewUrl}
            onApply={handleApplyFilters}
            onCancel={() => setScreen(SCREENS.EDITOR)}
          />
        )
      case SCREENS.ADD_TEXT:
        return (
          <AddText
            imageSrc={previewUrl}
            onApply={handleApplyFilters}
            onCancel={() => setScreen(SCREENS.EDITOR)}
          />
        )
      case SCREENS.COLOR_FILTERS:
        return (
          <ColorFilters
            imageSrc={previewUrl}
            onApply={handleApplyFilters}
            onCancel={() => setScreen(SCREENS.EDITOR)}
          />
        )
      case SCREENS.PRESET_SIZES:
        return (
          <PresetSizes
            onSelect={handleSizeSelect}
            onCancel={() => setScreen(SCREENS.EDITOR)}
          />
        )
      default:
        return (
          <ImageEditor
            imageSrc={previewUrl}
            onBack={handleBackToUpload}
            onOpenFilters={handleOpenFilters}
            onSize={handleOpenSizes}
          />
        )
    }
  }

  return renderContent()
}

export default EditorContainer
