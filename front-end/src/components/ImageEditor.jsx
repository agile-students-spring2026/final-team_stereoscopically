import ImageCropper from './ImageCropper'

const ImageEditor = ({ imageSrc, onOpenFilters, onBack }) => {
  return (
    <div className="image-editor-container">
      <h2 className="image-editor-title">Image Editor</h2>
      <div className="preview-box">
        <img src={imageSrc} alt="Preview" className="preview-image" />
      </div>
      <div className="card image-editor-actions">
        <button type="button" className="btn-primary" onClick={() => {}}>
          Size
        </button>
        <button type="button" className="btn-primary" onClick={() => {}}>
          Reframe
        </button>
        <button type="button" className="btn-primary" onClick={onOpenFilters}>
          Filters
        </button>
      </div>
      <div className="card-actions">
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