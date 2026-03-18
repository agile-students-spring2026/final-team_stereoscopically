import { useState } from 'react'
import './App.css'
import CreateNew from './components/CreateNew.jsx'
import ImageEditor from './components/ImageEditor.jsx'

function App() {
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null)

  const handleImageSelect = (file) => {
    setSelectedImage(file)
    const preview = URL.createObjectURL(file)
    setImagePreviewUrl(preview)
    console.log('Image stored in App:', file)
  }

  const handleBackToUpload = () => {
    setSelectedImage(null)
    setImagePreviewUrl(null)
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">StickerCreate</h1>
      </header>
      <main className="app-main">
        {!selectedImage ? (
          <CreateNew onImageSelect={handleImageSelect} />
        ) : (
          <ImageEditor imageSrc={imagePreviewUrl} onBack={handleBackToUpload} />
        )}
      </main>
    </div>
  )
}

export default App
