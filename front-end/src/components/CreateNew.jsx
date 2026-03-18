import React, { useState } from 'react'

const CreateNew = ({ onImageSelect }) => {
  const [imageFile, setImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  const handleImageChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImageFile(file);

    const url = URL.createObjectURL(file);
    setPreviewUrl(url)

    console.log('Selected file in CreateNew:', file)
    if (onImageSelect) {
      onImageSelect(file)
    }
  }

  return (
    <div className="card create-new">
      <h2>Create New</h2>

      <label htmlFor="image-upload" className="upload-button">
        Upload Image
      </label>

      <input
        id="image-upload"
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageChange}
      />

      {previewUrl && (
        <div className='preview-box'>
          <img src={previewUrl} alt='Upload preview'></img>
        </div>
      )
      
      }
    </div>
  )
}

export default CreateNew