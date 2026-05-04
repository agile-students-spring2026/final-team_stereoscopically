import EditorToolScreen from './EditorToolScreen'

function FilterMain({ onPresetFilters, onText, onColorFilters, onCancel }) {
  return (
    <EditorToolScreen
      title="Filters"
      controls={(
        <div className="card filter-main-buttons">
          <button type="button" className="btn-primary" onClick={onPresetFilters}>
            Preset Filters
          </button>
          {onText && (
            <button type="button" className="btn-primary" onClick={onText}>
              Text
            </button>
          )}
          {onColorFilters && (
            <button type="button" className="btn-primary" onClick={onColorFilters}>
              Color Filters
            </button>
          )}
        </div>
      )}
      actions={(
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Back to editor
        </button>
      )}
    />
  )
}
export default FilterMain