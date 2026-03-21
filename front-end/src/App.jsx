import { useState } from 'react'
import './App.css'
import EditorContainer from './components/EditorContainer'

function App() {
<<<<<<< HEAD
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null)
  const [filterScreen, setFilterScreen] = useState('editor')

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
            imageSrc={imagePreviewUrl}
            onPresetFilters={() => setFilterScreen('preset')}
            onAddText={() => setFilterScreen('text')}
            onColorFilters={() => setFilterScreen('color')}
            onBack={handleCloseFilters}
          />
        )
      case 'preset':
        return (
          <PresetFilters
            imageSrc={imagePreviewUrl}
            onApply={handleApplyFilters}
            onCancel={() => setFilterScreen('filters-main')}
          />
        )
      case 'text':
        return (
          <AddText
            imageSrc={imagePreviewUrl}
            onApply={handleApplyFilters}
            onCancel={() => setFilterScreen('filters-main')}
          />
        )
      case 'color':
        return (
          <ColorFilters
            imageSrc={imagePreviewUrl}
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

=======
>>>>>>> origin/master
  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">StickerCreate</h1>
      </header>
      <main className="app-main">
        <EditorContainer />
      </main>
    </div>
  )
}

export default App
