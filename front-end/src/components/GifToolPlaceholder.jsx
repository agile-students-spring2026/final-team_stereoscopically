function GifToolPlaceholder({ title, description, onBackToFilters, onBackToEditor }) {
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
        <button type="button" className="btn-secondary" onClick={onBackToFilters}>
          Back to Filters
        </button>
        <button type="button" className="btn-primary" onClick={onBackToEditor}>
          Return to Editor
        </button>
      </div>
    </div>
  )
}

export default GifToolPlaceholder