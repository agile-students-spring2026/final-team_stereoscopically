import { useState, useRef } from 'react'
import ImageCropper from './ImageCropper'

const ImageEditor = ({
  imageSrc,
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
  const [imageLoadError, setImageLoadError] = useState(false)
  const cropContainerRef = useRef(null)

  const handleReframeClick = () => {
    setIsReframing(true)
  }

  const handleCropChange = (data) => {
    setCropData(data)
  }

  const handleApplyCrop = () => {
    if (!cropData){
      setIsReframing(false)
      console.log('Crop applied:', cropData)
    }

    const img = new Image()
    img.src = imageSrc
    img.onload = () => {

      const container = cropContainerRef.current
      const renderedWidth = container.offsetWidth
      const renderedHeight = container.offsetHeight
      const scaleX = img.naturalWidth / renderedWidth
      const scaleY = img.naturalHeight / renderedHeight

      const canvas = document.createElement('canvas')
      canvas.width = cropData.width * scaleX
      canvas.height = cropData.height * scaleY

      const ctx = canvas.getContext('2d')
      ctx.drawImage(
        img,
        cropData.x * scaleX,       
        cropData.y * scaleY,
        cropData.width * scaleX,
        cropData.height * scaleY,
        0, 0,           
        canvas.width,
        canvas.height 
      )
      
      const croppedUrl = canvas.toDataURL('image/png')
      onCropApply(croppedUrl)   // lift the new image URL up to the parent
      setIsReframing(false)

    }

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
        <div ref={cropContainerRef}>
          <ImageCropper imageSrc={imageSrc} onCropChange={handleCropChange} />
        </div>
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