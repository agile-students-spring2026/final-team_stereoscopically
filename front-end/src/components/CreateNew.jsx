const CreateNew = ({ onImageSelect, onVideoSelect, isLoading = false, errorMessage = null }) => {
  const statusMessage = errorMessage || (isLoading ? 'Loading media from Pixabay…' : null)

  const handleImageChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    onImageSelect?.(file)
  }

  const handleVideoChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    onVideoSelect?.(file)
  }

  return (
    <div className="card create-new">
      <h2>Create New</h2>

      <div className="upload-options">
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

      {statusMessage && (
        <p role="status" className="upload-status">
          {statusMessage}
        </p>
      )}
    </div>
  )
}

export default CreateNew