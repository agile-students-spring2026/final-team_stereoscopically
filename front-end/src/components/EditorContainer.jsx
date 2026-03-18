import { useState } from 'react'
import CreateNew from './CreateNew'
import ImageEditor from './ImageEditor'
import FilterMain from './FilterMain'
import PresetFilters from './PresetFilters'
import AddText from './AddText'
import ColorFilters from './ColorFilters'

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
      default:
        return (
          <ImageEditor
            imageSrc={imagePreviewUrl}
            onBack={handleBackToUpload}
            onOpenFilters={handleOpenFilters}
          />
        )
    }
  }

  return renderContent()
}

export default EditorContainer
