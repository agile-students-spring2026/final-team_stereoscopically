function FilterScreen({ title, children, imageSrc, onApply, onCancel }) {
  return (
    <div className="app-container">
      <div className="screen-header">
        <div className="app-logo">StickerCreate</div>
        <h2 className="screen-title">{title}</h2>
      </div>
      <div className="preview-box">
        {imageSrc ? (
          <img src={imageSrc} alt="Preview" className="preview-image" />
        ) : (
          <span className="preview-label">Preview of Creation</span>
        )}
      </div>
      <div className="card">
        {children}
      </div>
      <div className="card-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn-primary" onClick={onApply}>
          Apply
        </button>
      </div>
    </div>
  )
}

export default FilterScreen
