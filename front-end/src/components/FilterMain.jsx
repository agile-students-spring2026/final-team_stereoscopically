import EditorToolScreen from './EditorToolScreen'

function FilterMain({ onPresetFilters, onAddText, onColorFilters }) {
  return (
    <EditorToolScreen
      title="Filters"
      hideActions
      controls={(
        <div className="card filter-main-buttons">
          <button type="button" className="btn-primary" onClick={onPresetFilters}>
            Preset Filters
          </button>
          {onAddText && (
            <button type="button" className="btn-primary" onClick={onAddText}>
              Add Text
            </button>
          )}
          {onColorFilters && (
            <button type="button" className="btn-primary" onClick={onColorFilters}>
              Color Filters
            </button>
          )}
        </div>
      )}
    />
  )
}
export default FilterMain