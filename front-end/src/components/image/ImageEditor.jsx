import { useCallback, useState } from 'react'
import ImageCropper from './ImageCropper'

const ImageEditor = ({
  imageSrc,
  cropSourceImageSrc = null,
  initialCropPx = null,
  onCropApply,
  onOpenFilters,
  onBack,
  onSize,
  onExport,
  onResetExportSettings,
  showResetExportSettings = false,
  isUploading = false,
  uploadError = null,
  isExporting = false,
  exportError = null,
  sessionNotice = null,
}) => {
  // Track if cropper is active
  const [isCropping, setIsCropping] = useState(false)
  // Track current crop data
  const [cropData, setCropData] = useState(null)
  const [imageLoadError, setImageLoadError] = useState(false)
  const [cropError, setCropError] = useState(null)

  const handleCropClick = () => {
    setCropError(null)
    setIsCropping(true)
  }

  const handleCropChange = useCallback((data) => {
    setCropData(data)
  }, [])

  const handleApplyCrop = async () => {
    if (!cropData?.ratio) {
      setCropError('Crop preview is not ready yet. Please try again.')
      return
    }

    try {
      setCropError(null)
      await onCropApply?.(cropData)
      setIsCropping(false)
    } catch (err) {
      setCropError('Could not apply crop. Please try again.')
      console.error('Crop failed:', err)
    }
  }

  const handleCancelCrop = () => {
    setIsCropping(false)
    setCropError(null)
  }

  const handleImageError = () => {
    setImageLoadError(true)
  }

  // Show cropper if cropping, otherwise show preview
  if (isCropping) {
    return (
      <div className="image-editor-container">
        <h2 className="image-editor-title">Crop Image</h2>
        <p role="note" className="upload-status" style={{ marginTop: '0.5rem', color: '#555' }}>
          Cropping uses your current preview (filters and color edits included).
        </p>
        {cropError && (
          <p role="alert" className="upload-status" style={{ marginTop: '0.5rem', color: '#ff3b30' }}>
            {cropError}
          </p>
        )}
        <ImageCropper
          imageSrc={cropSourceImageSrc || imageSrc}
          initialCropPx={initialCropPx}
          onCropChange={handleCropChange}
        />
        <div className="card-actions">
          <button type="button" className="btn-secondary" onClick={handleCancelCrop}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleApplyCrop}>
            Apply Crop
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="image-editor-container">
      <h2 className="image-editor-title">Image Editor</h2>

      {uploadError && (
        <p role="alert" className="upload-status" style={{ marginTop: '0.5rem', color: '#ff3b30' }}>
          {uploadError}
        </p>
      )}
      {exportError && (
        <p role="alert" className="upload-status" style={{ marginTop: '0.5rem', color: '#ff3b30' }}>
          {exportError}
        </p>
      )}
      {sessionNotice && (
        <p role="status" className="upload-status session-notice">
          {sessionNotice}
        </p>
      )}

      {imageLoadError && (
        <p role="alert" className="upload-status" style={{ marginTop: '0.5rem', color: '#ff3b30' }}>
          This image format cannot be displayed in your browser. Please upload JPG or PNG.
        </p>
      )}

      <div
        className="preview-box preview-box-checkered"
        style={{ opacity: isUploading ? 0.75 : 1, transition: 'opacity 150ms ease' }}
      >
        {!imageLoadError && (
          <img
            src={imageSrc}
            alt="Preview"
            className="preview-image"
            onError={handleImageError}
          />
        )}
      </div>
      <div className="card image-editor-actions">
        <button type="button" className="btn-primary" onClick={onOpenFilters}>
          Filters
        </button>
        <button type="button" className="btn-primary" onClick={handleCropClick}>
          Crop
        </button>
        <button type="button" className="btn-primary" onClick={onSize || (() => {})}>
          Resize
        </button>
        {showResetExportSettings && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onResetExportSettings?.()}
            disabled={isExporting}
          >
            Reset resize
          </button>
        )}
      </div>
      <div className="card-actions card-actions-spaced">
        <button type="button" className="btn-secondary" onClick={onBack}>
          Cancel
        </button>
        <button type="button" className="btn-primary" onClick={onExport || (() => {})} disabled={isExporting}>
          {isExporting ? 'Exporting...' : 'Export'}
        </button>
      </div>
    </div>
  )
}

export default ImageEditor