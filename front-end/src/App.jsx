import { useState } from 'react'
import './App.css'
import CreateNew from './components/CreateNew.jsx'
import ImageEditor from './components/ImageEditor.jsx'

function App() {
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null)

  const handleImageSelect = (file) => {
    setSelectedImage(file)

    const previewUrl = URL.createObjectURL(file)
    setImagePreviewUrl(previewUrl)

    console.log('Image stored in App:', file)
    console.log('Preview URL:', previewUrl)
  }

return (
  <div className="app-container">
    <header className="app-header">
      <h1 className="app-title">StickerCreate</h1>
    </header>

    <main className="app-main">
      {imagePreviewUrl ? (
        <ImageEditor imageSrc={imagePreviewUrl} />
      ) : (
        <CreateNew onImageSelect={handleImageSelect} />
      )}
    </main>
  </div>
)
}

export default App
