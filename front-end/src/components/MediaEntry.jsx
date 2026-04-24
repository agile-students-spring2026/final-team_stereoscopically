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
  const imageFileInputRef = useRef(null)
  const videoFileInputRef = useRef(null)

  const statusMessage = selectionError

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

  const handleCameraClick = () => {
    if (isLoading || isCameraDisabled) return
    onCameraSelect?.()
  }

  const unsupportedVideoTypeLabel =
    unsupportedVideo?.type ||
    unsupportedVideo?.name?.split('.').pop() ||
    'unknown format'

  return (
    <>
      <div className="card create-new create-new-card">
        <div className="create-new-header">
          <h2>Create New</h2>
          <p className="create-new-subtitle">
            Choose how you want to start creating your sticker.
          </p>
        </div>

        <div className="create-new-actions">
          <label
            className={`create-action-row ${isLoading ? 'create-action-row--disabled' : ''}`}
            aria-disabled={isLoading}
          >
            <div className="create-action-row__content">
              <div className="create-action-row__title">Upload Image</div>
              <div className="create-action-row__subtitle">
                Start from a JPG or PNG image.
              </div>
            </div>

            <span className="create-action-row__chevron" aria-hidden="true">
              ›
            </span>

            <input
              ref={imageFileInputRef}
              type="file"
              accept="image/*"
              className="hidden-file-input"
              disabled={isLoading}
              onChange={handleImageInputChange}
            />
          </label>

          <label
            className={`create-action-row ${isLoading ? 'create-action-row--disabled' : ''}`}
            aria-disabled={isLoading}
          >
            <div className="create-action-row__content">
              <div className="create-action-row__title">Upload Video</div>
              <div className="create-action-row__subtitle">
                Turn a video into a sticker or GIF.
              </div>
            </div>

            <span className="create-action-row__chevron" aria-hidden="true">
              ›
            </span>

            <input
              ref={videoFileInputRef}
              type="file"
              accept="video/*"
              className="hidden-file-input"
              disabled={isLoading}
              onChange={handleVideoInputChange}
            />
          </label>

          <button
            type="button"
            className="create-action-row create-action-row--button"
            onClick={handleCameraClick}
            disabled={isLoading || isCameraDisabled}
          >
            <div className="create-action-row__content">
              <div className="create-action-row__title">Open Camera</div>
              <div className="create-action-row__subtitle">
                Capture a photo or video directly.
              </div>
            </div>

            <span className="create-action-row__chevron" aria-hidden="true">
              ›
            </span>
          </button>
        </div>

        {(statusMessage || validationError) && (
          <div className="create-new-statuses">
            {statusMessage && <EditorStatus>{statusMessage}</EditorStatus>}
            {validationError && (
              <EditorStatus tone="error">{validationError}</EditorStatus>
            )}
          </div>
        )}
      </div>

      {unsupportedVideo && (
        <div className="upload-modal-overlay" role="dialog" aria-modal="true">
          <div className="upload-modal">
            <h3 className="upload-modal__title upload-modal__title--error">
              Unsupported Video Format
            </h3>

            <p className="upload-modal__text">
              This video format ({unsupportedVideoTypeLabel}) is not supported by your
              browser.
              <br />
              Please upload an MP4 or WebM video.
            </p>

            <div className="upload-modal__actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  onDismissUnsupportedVideo?.()
                  openVideoPicker()
                }}
              >
                Re-upload Video
              </button>
            </div>
          </div>
        </div>
      )}

      {fileTooLargeMessage && (
        <div className="upload-modal-overlay" role="dialog" aria-modal="true">
          <div className="upload-modal">
            <h3 className="upload-modal__title upload-modal__title--error">
              Upload Error
            </h3>

            <p className="upload-modal__text">{fileTooLargeMessage}</p>

            <div className="upload-modal__actions">
              <button
                type="button"
                className="btn-primary"
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
        </div>
      )}

      {unsupportedImageMessage && (
        <div className="upload-modal-overlay" role="dialog" aria-modal="true">
          <div className="upload-modal">
            <h3 className="upload-modal__title upload-modal__title--error">
              Unsupported Image Format
            </h3>

            <p className="upload-modal__text">{unsupportedImageMessage}</p>

            <div className="upload-modal__actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  onDismissUnsupportedImage?.()
                  openImagePicker()
                }}
              >
                Re-upload
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default MediaEntry