const CreateNew = ({ onImageSelect, onVideoSelect, isLoading = false, errorMessage = null }) => {
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

        <button
          type="button"
          className="upload-button"
          onClick={() => onVideoSelect?.()}
          disabled={isLoading}
        >
          Upload Video
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