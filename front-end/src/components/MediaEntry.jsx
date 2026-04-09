const MediaEntry = ({
  onImageSelect,
  onVideoSelect,
  onCameraSelect,
  isCameraDisabled = false,
  isLoading = false,
  selectionError = null,
  validationError = null,
}) => {
  const statusMessage = selectionError

  return (
    <div className="card create-new">
      <h2>Create New</h2>

      <div className="upload-options">
        <label className="upload-button" style={{ display: 'inline-block', cursor: isLoading ? 'not-allowed' : 'pointer' }}>
          Upload Image
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            disabled={isLoading}
            onChange={e => {
              const file = e.target.files && e.target.files[0]
              if (file && onImageSelect) onImageSelect(file)
              e.target.value = ''
            }}
          />
        </label>

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
              e.target.value = ''
            }}
          />
        </label>

        <button
          type="button"
          className="upload-button"
          onClick={() => {
            if (!isCameraDisabled) onCameraSelect?.()
          }}
          disabled={isLoading || isCameraDisabled}
        >
          Open Camera
        </button>
      </div>

      {statusMessage && (
        <p role="status" className="upload-status">
          {statusMessage}
        </p>
      )}

      {validationError && (
        <p role="alert" className="upload-status" style={{ color: '#ff3b30' }}>
          {validationError}
        </p>
      )}
    </div>
  )
}

export default MediaEntry
