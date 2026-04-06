const CreateNew = ({ onImageSelect, onVideoSelect, onCameraSelect, isLoading = false, errorMessage = null }) => {
  const statusMessage = errorMessage || (isLoading ? 'Loading media from Pixabay…' : null)

  return (
    <div className="card create-new">
      <h2>Create New</h2>

      <div className="upload-options">
        <button
          type="button"
          className="upload-button"
          onClick={() => onImageSelect?.()}
          disabled={isLoading}
        >
          Upload Image
        </button>

        <label className="upload-button" style={{ display: 'inline-block', cursor: isLoading ? 'not-allowed' : 'pointer' }}>
          Upload Video
          <input
            type="file"
            accept="video/*"
            style={{ display: 'none' }}
            disabled={isLoading}
            onChange={e => {
              const file = e.target.files && e.target.files[0]
              if (file && onVideoSelect) onVideoSelect(file)
              // Reset input so same file can be selected again if needed
              e.target.value = ''
            }}
          />
        </label>

        <button
          type="button"
          className="upload-button"
          onClick={() => onCameraSelect?.()}
          disabled={isLoading}
        >
          Open Camera
        </button>
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
