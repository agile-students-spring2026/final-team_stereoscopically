import { useState } from 'react'
import ImageCropper from './ImageCropper'

const ImageEditor = ({
  imageSrc,
  onOpenFilters,
  onBack,
  onSize,
  onExport,
  isUploading = false,
  uploadError = null,
  isExporting = false,
  exportError = null,
}) => {
  // Track if cropper is active
  const [isReframing, setIsReframing] = useState(false)
  // Track current crop data
  const [cropData, setCropData] = useState(null)
  const [imageLoadError, setImageLoadError] = useState(false)

  const handleReframeClick = () => {
    setIsReframing(true)
  }

  const handleCropChange = (data) => {
    setCropData(data)
  }

  const handleApplyCrop = () => {
    setIsReframing(false)
    console.log('Crop applied:', cropData)
  }

  const handleCancelCrop = () => {
    setIsReframing(false)
    setCropData(null)
  }

  const handleImageError = () => {
    setImageLoadError(true)
  }

  // Show cropper if reframing, otherwise show preview
  if (isReframing) {
    return (
      <div className="image-editor-container">
        <h2 className="image-editor-title">Reframe Image</h2>
        <ImageCropper imageSrc={imageSrc} onCropChange={handleCropChange} />
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
            onLoad={() => setImageLoadError(false)}
            onError={handleImageError}
          />
        )}
      </div>
      <div className="card image-editor-actions">
        <button type="button" className="btn-primary" onClick={onSize || (() => {})}>
          Resize
        </button>
        <button type="button" className="btn-primary" onClick={handleReframeClick}>
          Reframe
        </button>
        <button type="button" className="btn-primary" onClick={onOpenFilters}>
          Filters
        </button>
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