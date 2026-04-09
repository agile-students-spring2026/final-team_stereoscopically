function FilterScreen({
  title,
  children,
  imageSrc,
  onApply,
  onCancel,
  previewInteractive = false,
  onPreviewPointerDown,
  onPreviewPointerMove,
  previewOverlay = null,
  previewContainerRef = null,
  previewImageRef = null,
}) {
  return (
    <div className="preset-sizes-screen">
      <div className="screen-header screen-header-column">
        <h2 className="screen-title">{title}</h2>
      </div>
      <div
        ref={previewContainerRef}
        className={`preview-box ${previewInteractive ? 'preview-box-interactive' : ''}`}
        onPointerDown={previewInteractive ? onPreviewPointerDown : undefined}
        onPointerMove={previewInteractive ? onPreviewPointerMove : undefined}
      >
        {imageSrc ? (
          <img ref={previewImageRef} src={imageSrc} alt="Preview" className="preview-image" />
        ) : (
          <span className="preview-label">Preview of Creation</span>
        )}

        {previewOverlay ? (
          <div className="filter-screen-preview-overlay">
            {previewOverlay}
          </div>
        ) : null}
      </div>
      <div className="card filter-main-buttons">{children}</div>
      <div className="card-actions preset-sizes-screen-actions">
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
