import { useState } from 'react'
import ImageCropper from './ImageCropper'

const ImageEditor = ({ imageSrc, onOpenFilters, onBack, onSize }) => {
  // Track if cropper is active
  const [isReframing, setIsReframing] = useState(false)
  const [cropData, setCropData] = useState(null)

  const handleReframeClick = () => {
    setIsReframing(true)
  }

  const handleCropChange = (data) => {
    setCropData(data)
  }

  const handleApplyCrop = () => {
    if (!cropData) {
      setIsReframing(false)
      return
    }

    // TODO: integrate cropData with parent pipeline when image editing enhancements land
    setIsReframing(false)
  }

  const handleCancelCrop = () => {
    setIsReframing(false)
    setCropData(null)
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
      <div className="preview-box">
        <img src={imageSrc} alt="Preview" className="preview-image" />
      </div>
      <div className="card image-editor-actions">
        <button type="button" className="btn-primary" onClick={onSize || (() => {})}>
          Size
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
        <button type="button" className="btn-primary">
          Export
        </button>
      </div>
    </div>
  )
}

export default ImageEditor