import { useState } from 'react'
import './App.css'
import CreateNew from './components/CreateNew.jsx'

function App() {
  const [selectedImage, setSelectedImage] = useState(null)

  const handleImageSelect = (file) => {
    setSelectedImage(file)
    console.log('Image stored in App:', file)
  }

  return (
    <>
      <CreateNew onImageSelect={handleImageSelect} />
    </>
  )
}

export default App
