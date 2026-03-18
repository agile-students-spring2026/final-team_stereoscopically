import React from 'react'

const CreateNew = ({ onImageSelect }) => {
  const handleImageChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

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
        className="file-input-hidden"
        onChange={handleImageChange}
      />
    </div>
  )
}

export default CreateNew