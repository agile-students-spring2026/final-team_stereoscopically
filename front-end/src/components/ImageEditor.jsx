import { useState, useRef } from 'react'
import ImageCropper from './ImageCropper'
import { cropImageFromBackend } from '../services/backendImageService'

const ImageEditor = ({
  imageSrc,
  backendMediaId, 
  onCropApply,
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
  const [isApplyingCrop, setIsApplyingCrop] = useState(false)
  const [cropError, setCropError] = useState(null)
  const [imageLoadError, setImageLoadError] = useState(false)
  const cropContainerRef = useRef(null)
  const [naturalSize, setNaturalSize] = useState({ width: 1, height: 1 })

  const handleReframeClick = () => {
    setCropError(null)
    setIsReframing(true)
  }

  const handleCropChange = (data) => {
    setCropData(data)
    if (cropError) {
      setCropError(null)
    }
  }

  const handleApplyCrop = async () => {
    if (!cropData || isApplyingCrop) return
    if (!backendMediaId) {
      setCropError('Image is not ready for cropping yet. Please re-upload and try again.')
      return
    }

    const imgElement = cropContainerRef.current?.querySelector('.cropper-image')
    if (!imgElement) {
      setCropError('Crop preview is not ready yet. Please try again.')
      return
    }

    // Use the actual image element to find display dimensions
    const { width: displayedW, height: displayedH } = imgElement.getBoundingClientRect()
    if (!displayedW || !displayedH || !naturalSize.width || !naturalSize.height) {
      setCropError('Crop dimensions are not ready yet. Please try again.')
      return
    }

    const scaleX = naturalSize.width / displayedW
    const scaleY = naturalSize.height / displayedH

    try {
      setIsApplyingCrop(true)
      setCropError(null)

      const result = await cropImageFromBackend({
        mediaId: backendMediaId,
        x: cropData.x,
        y: cropData.y,
        width: cropData.width,
        height: cropData.height,
        scaleX,
        scaleY,
      })
      onCropApply(result)
      setIsReframing(false)
      setCropData(null)
    } catch (err) {
      console.error('Crop failed:', err)
      setCropError(err?.message || 'Failed to apply crop. Please try again.')
    } finally {
      setIsApplyingCrop(false)
    }
  }

  const handleCancelCrop = () => {
    setIsApplyingCrop(false)
    setCropError(null)
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
        {cropError && (
          <p role="alert" className="upload-status" style={{ marginTop: '0.5rem', color: '#ff3b30' }}>
            {cropError}
          </p>
        )}
        <div ref={cropContainerRef}>
          <ImageCropper imageSrc={imageSrc} onCropChange={handleCropChange} />
        </div>
        <div className="card-actions">
          <button type="button" className="btn-secondary" onClick={handleCancelCrop} disabled={isApplyingCrop}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleApplyCrop}
            disabled={isApplyingCrop || !cropData || !backendMediaId}
          >
            {isApplyingCrop ? 'Applying...' : 'Apply Crop'}
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
            onLoad={(e) => setNaturalSize({ width: e.target.naturalWidth, height: e.target.naturalHeight })}
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