import { useState } from 'react'
import ImageCropper from './ImageCropper'

const ImageEditor = ({ imageSrc, onOpenFilters, onBack, onOpenSizes, onApplyCustomSize, onExport }) => {  // Track if cropper is active
  const [isReframing, setIsReframing] = useState(false)
  // Track current crop data
  const [cropData, setCropData] = useState(null)

  const [width,setWidth] = useState(300)
  const [height,setHeight] = useState(300)

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

  // Show cropper if reframing, otherwise show preview
  if (isReframing) {
    return (
      <div className="image-editor-container">
        <h2 className="image-editor-title">Crop Image</h2>
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
        <button type="button" className="btn-primary" onClick={onOpenSizes || (() => {})}>
          Preset Sizes
        </button>
        <button type="button" className="btn-primary" onClick={handleReframeClick}>
          Crop
        </button>
        <button type="button" className="btn-primary" onClick={onOpenFilters}>
          Filters
        </button>
      </div>
      <div className="card">
        <h3>Custom Size</h3>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <input 
            type="number"
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            placeholder="Width"
          />
          <input 
            type="number"
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            placeholder="Height"
          />
      </div>

      <button 
        type="button"
        className="btn-primary"
        onClick={() => onApplyCustomSize && onApplyCustomSize ({ id: 'custom', width, height })}
      >
        Apply Size 
      </button>
    </div>
      <div className="card-actions" style={{ marginTop: '1.25rem' }}>
        <button type="button" className="btn-secondary" onClick={onBack}>
          Cancel
        </button>
        <button type="button" className="btn-primary" onClick={onExport}>
          Export
        </button>
      </div>
    </div>
  )
}

export default ImageEditor