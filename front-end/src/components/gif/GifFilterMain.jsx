import EditorToolScreen from '../EditorToolScreen'

function GifFilterMain({ onPresetFilters, onTextOverlay, onSpeed, onCancel }) {
  return (
    <EditorToolScreen
      title="Filters"
      controls={(
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
      )}
      actions={(
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Back
        </button>
      )}
    />
  )
}

export default GifFilterMain