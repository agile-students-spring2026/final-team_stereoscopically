import { useState } from 'react'
import CreateNew from './CreateNew'
import ImageEditor from './ImageEditor'
import FilterMain from './FilterMain'
import PresetFilters from './PresetFilters'
import PresetSizes from './PresetSizes'
import AddText from './AddText'
import ColorFilters from './ColorFilters'

function resizeImageToDimensions(imageUrl, targetWidth, targetHeight) {
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

      const imgAspect = img.width / img.height
      const targetAspect = targetWidth / targetHeight
      let sx, sy, sWidth, sHeight

      // Scale image to fit target while maintaining aspect ratio
      // If image is wider than target, fit to height
      if (imgAspect > targetAspect) {
        sHeight = img.height
        sWidth = img.height * targetAspect
        sx = (img.width - sWidth) / 2
        sy = 0
      } else {
        // If image is taller than target, fit to width
        sWidth = img.width
        sHeight = img.width / targetAspect
        sx = 0
        sy = (img.height - sHeight) / 2
      }

      // Draw with high quality
      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight)
      
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
  const [filterScreen, setFilterScreen] = useState('filters-main')

  const handleImageSelect = (file) => {
    setSelectedImage(file)
    const preview = URL.createObjectURL(file)
    setImagePreviewUrl(preview)
    setFilterScreen('editor')
    console.log('Image stored in App:', file)
  }

  const handleBackToUpload = () => {
    setSelectedImage(null)
    setImagePreviewUrl(null)
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

  const handleSizeSelect = async (size) => {
    if (!size.width || !size.height) {
      setFilterScreen('editor')
      return
    }
    if (!imagePreviewUrl) {
      setFilterScreen('editor')
      return
    }
    try {
      const { file, url } = await resizeImageToDimensions(
        imagePreviewUrl,
        size.width,
        size.height
      )
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
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
            onSize={handleOpenSizes}
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
            onSize={handleOpenSizes}
          />
        )
    }
  }

  return renderContent()
}

export default EditorContainer
