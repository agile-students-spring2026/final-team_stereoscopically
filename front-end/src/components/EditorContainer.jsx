import { useMemo, useState } from 'react'
import CreateNew from './CreateNew'
import ImageEditor from './ImageEditor'
import FilterMain from './FilterMain'
import PresetFilters from './PresetFilters'
import PresetSizes from './PresetSizes'
import AddText from './AddText'
import ColorFilters from './ColorFilters'
import GifEditor from './GifEditor'
import useMediaSelection from '../hooks/useMediaSelection'

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
  const {
    mediaType,
    selectedMedia,
    previewUrl,
    sourceUrl,
    isLoading: isSelectionLoading,
    error: selectionError,
    selectImage,
    selectVideo,
    resetSelection,
    applyTransformedImage,
  } = useMediaSelection(preferredMockMediaType)
  const [screen, setScreen] = useState(SCREENS.EDITOR)
  const handleImageSelect = () => {
    selectImage()
    setScreen(SCREENS.EDITOR)
  }

  const handleVideoSelect = () => {
    selectVideo()
    setScreen(SCREENS.EDITOR)
  }

  const handleBackToUpload = () => {
    resetSelection()
    setScreen(SCREENS.EDITOR)
  }

  const handleOpenFilters = () => {
    setScreen(SCREENS.FILTERS_MAIN)
  }

  const handleApplyFilters = () => {
    setScreen(SCREENS.EDITOR)
  }

  const handleOpenSizes = () => {
    setScreen(SCREENS.PRESET_SIZES)
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
      applyTransformedImage(file, url)
    } catch (err) {
      console.error('Resize failed:', err)
    }
    setScreen(SCREENS.EDITOR)
  }

  const renderContent = () => {
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
