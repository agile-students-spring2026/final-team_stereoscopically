function FilterMain({ onPresetFilters, onAddText, onColorFilters }) {
  return (
    <div className="preset-sizes-screen">
      <div className="screen-header screen-header-column">
        <h2 className="screen-title">Filters</h2>
      </div>
      <div className="card filter-main-buttons">
        <button type="button" className="btn-primary" onClick={onPresetFilters}>
          Preset Filters
        </button>
        <button type="button" className="btn-primary" onClick={onAddText}>
          Add Text
        </button>
        <button type="button" className="btn-primary" onClick={onColorFilters}>
          Color Filters
        </button>
      </div>
    </div>
  );
}

export default FilterMain;
