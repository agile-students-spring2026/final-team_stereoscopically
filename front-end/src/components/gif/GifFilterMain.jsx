function GifFilterMain({ onPresetFilters, onTextOverlay, onSpeed, onCancel }) {
  return (
    <div className="editor-tool-screen preset-sizes-screen">
      <div className="screen-header screen-header-column">
        <h2 className="screen-title">Filters</h2>
      </div>
      <div className="card filter-main-buttons">
        <button type="button" className="btn-primary" onClick={onPresetFilters}>
          Preset Filters
        </button>
        <button type="button" className="btn-primary" onClick={onTextOverlay}>
          Text
        </button>
        <button type="button" className="btn-primary" onClick={onSpeed}>
          Speed
        </button>
      </div>
      <div className="card-actions editor-actions editor-actions--inline editor-tool-screen-actions preset-sizes-screen-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default GifFilterMain