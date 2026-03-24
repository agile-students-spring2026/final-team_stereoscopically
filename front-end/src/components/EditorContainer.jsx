import { useState } from 'react'
import CreateNew from './CreateNew'
import ImageEditor from './ImageEditor'
import FilterMain from './FilterMain'
import PresetFilters from './PresetFilters'
import PresetSizes from './PresetSizes'
import AddText from './AddText'
import ColorFilters from './ColorFilters'

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
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null)
  // Keep original image URL to always resize from original
  const [originalImageUrl, setOriginalImageUrl] = useState(null)
  const [filterScreen, setFilterScreen] = useState('filters-main')

  const handleImageSelect = (file) => {
    setSelectedImage(file)
    const preview = URL.createObjectURL(file)
    setImagePreviewUrl(preview)
    setOriginalImageUrl(preview)
    setFilterScreen('editor')
    console.log('Image stored in App:', file)
  }

  const handleBackToUpload = () => {
    setSelectedImage(null)
    setImagePreviewUrl(null)
    setOriginalImageUrl(null)
    setFilterScreen('editor')
  }

  const handleOpenFilters = () => {
    setFilterScreen('filters-main')
  }

  const handleCloseFilters = () => {
    setFilterScreen('editor')
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
      setSelectedImage(file)
      setImagePreviewUrl(url)
    } catch (err) {
      console.error('Resize failed:', err)
    }
    setFilterScreen('editor')
  }

  const renderContent = () => {
    if (!selectedImage) {
      return <CreateNew onImageSelect={handleImageSelect} />
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
