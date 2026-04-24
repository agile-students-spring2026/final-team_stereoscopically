import { useRef } from 'react'
import EditorStatus from './EditorStatus'

const MediaEntry = ({
  onImageSelect,
  onVideoSelect,
  onCameraSelect,
  isCameraDisabled = false,
  isLoading = false,
  selectionError = null,
  validationError = null,
  unsupportedVideo = null,
  fileTooLargeMessage = null,
  unsupportedImageMessage = null,
  lastRejectedUploadType = null,
  onDismissUnsupportedVideo,
  onDismissFileTooLarge,
  onDismissUnsupportedImage,
}) => {
  const statusMessage = selectionError
  const imageFileInputRef = useRef(null)
  const videoFileInputRef = useRef(null)

  const handleImageInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file && onImageSelect) onImageSelect(file)
    e.target.value = ''
  }

  const handleVideoInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file && onVideoSelect) onVideoSelect(file)
    e.target.value = ''
  }

  const openImagePicker = () => {
    if (isLoading) return
    imageFileInputRef.current?.click()
  }

  const openVideoPicker = () => {
    if (isLoading) return
    videoFileInputRef.current?.click()
  }

  return (
    <>
      <div className="card create-new">
        <h2>Create New</h2>

        <div className="upload-options">
          <label className="btn-primary" style={{ cursor: isLoading ? 'not-allowed' : 'pointer' }}>
            Upload Image
            <input
              ref={imageFileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              disabled={isLoading}
              onChange={handleImageInputChange}
            />
          </label>

          <label className="btn-primary" style={{ cursor: isLoading ? 'not-allowed' : 'pointer' }}>
            Upload Video
            <input
              ref={videoFileInputRef}
              type="file"
              accept="video/*"
              style={{ display: 'none' }}
              disabled={isLoading}
              onChange={handleVideoInputChange}
            />
          </label>

          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              if (!isCameraDisabled) onCameraSelect?.()
            }}
            disabled={isLoading || isCameraDisabled}
          >
            Open Camera
          </button>
        </div>

        {statusMessage && (
          <EditorStatus>
            {statusMessage}
          </EditorStatus>
        )}

        {validationError && (
          <EditorStatus tone="error">
            {validationError}
          </EditorStatus>
        )}
      </div>

      {unsupportedVideo && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ background: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 16px rgba(0,0,0,0.2)', maxWidth: 360, textAlign: 'center' }}>
            <h3 style={{ color: '#c00', marginBottom: '1rem' }}>Unsupported Video Format</h3>
            <p style={{ marginBottom: '1.5rem' }}>
              This video format ({unsupportedVideo.type || unsupportedVideo.name.split('.').pop()}) is not supported by your browser.<br />
              Please upload an MP4 or WebM video.
            </p>
            <button
              className="btn-primary"
              style={{ marginBottom: '1rem' }}
              onClick={() => {
                onDismissUnsupportedVideo?.()
                openVideoPicker()
              }}
            >
              Re-upload Video
            </button>
          </div>
        </div>
      )}

      {fileTooLargeMessage && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ background: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 16px rgba(0,0,0,0.2)', maxWidth: 360, textAlign: 'center' }}>
            <h3 style={{ color: '#c00', marginBottom: '1rem' }}>Upload Error</h3>
            <p style={{ marginBottom: '1.5rem' }}>{fileTooLargeMessage}</p>
            <button
              className="btn-primary"
              style={{ marginBottom: '1rem' }}
              onClick={() => {
                onDismissFileTooLarge?.()
                if (lastRejectedUploadType === 'video') {
                  openVideoPicker()
                  return
                }
                if (lastRejectedUploadType === 'image') {
                  openImagePicker()
                }
              }}
            >
              Re-upload
            </button>
          </div>
        </div>
      )}

      {unsupportedImageMessage && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ background: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 16px rgba(0,0,0,0.2)', maxWidth: 360, textAlign: 'center' }}>
            <h3 style={{ color: '#c00', marginBottom: '1rem' }}>Unsupported Image Format</h3>
            <p style={{ marginBottom: '1.5rem' }}>{unsupportedImageMessage}</p>
            <button
              className="btn-primary"
              style={{ marginBottom: '1rem' }}
              onClick={() => {
                onDismissUnsupportedImage?.()
                openImagePicker()
              }}
            >
              Re-upload
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default MediaEntry
