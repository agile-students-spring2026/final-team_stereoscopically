function FilterMain({ onPresetFilters, onAddText, onColorFilters }) {
  return (
    <div className="editor-tool-screen preset-sizes-screen">
      <div className="screen-header screen-header-column">
        <h2 className="screen-title">Filters</h2>
      </div>
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
    </div>
  );
}
export default FilterMain;