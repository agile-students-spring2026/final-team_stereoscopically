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
    setFilterScreen('filters-main')
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
            onApply={handleApplyFilters}
            onCancel={() => setFilterScreen('filters-main')}
          />
        )
      case 'text':
        return (
          <AddText
            onApply={handleApplyFilters}
            onCancel={() => setFilterScreen('filters-main')}
          />
        )
      case 'color':
        return (
          <ColorFilters
            onApply={handleApplyFilters}
            onCancel={() => setFilterScreen('filters-main')}
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
