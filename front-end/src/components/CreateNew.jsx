import React from 'react'

const CreateNew = ({ onImageSelect, onVideoSelect }) => {
  const handleImageChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    console.log('Selected file in CreateNew:', file)
    if (onImageSelect) {
      onImageSelect(file)
    }
  }

  const handleVideoChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (onVideoSelect){
      onVideoSelect(file)
    }
  }

  return (
    <div className="card create-new">
      <h2>Create New</h2>

      <div className='upload-options'>

        <label htmlFor="image-upload" className="upload-button">
          Upload Image
        </label>

        <input
          id="image-upload"
          type="file"
          accept="image/*"
          className="hidden-file-input"
          onChange={handleImageChange}
        />

        <label htmlFor="video-upload" className="upload-button">
          Upload Video
        </label>

        <input
          id="video-upload"
          type="file"
          accept="video/*"
          className="hidden-file-input"
          onChange={handleVideoChange}
        />
      </div>
    </div>
  )
}

export default CreateNew