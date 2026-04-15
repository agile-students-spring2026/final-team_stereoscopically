function GifToolPlaceholder({ title, description, onBack, onCancel }) {
  return (
    <div className="preset-sizes-screen">
      <div className="screen-header screen-header-column">
        <h2 className="screen-title">{title}</h2>
        {description ? <p className="screen-subtitle">{description}</p> : null}
      </div>

      <div className="card filter-main-buttons">
        <p className="preview-label" style={{ margin: 0, textAlign: 'center' }}>
          This editor option is wired into the GIF flow and ready for implementation.
        </p>
      </div>

      <div className="card-actions preset-sizes-screen-actions">
        <button type="button" className="btn-secondary" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn-primary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default GifToolPlaceholder