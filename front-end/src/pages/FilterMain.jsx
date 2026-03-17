function FilterMain({ onPresetFilters, onAddText, onColorFilters, onApply, onCancel }) {
  return (
    <div className="app-container">
      <div className="screen-header">
        <div className="app-logo">StickerCreate</div>
        <h2 className="screen-title">Filters</h2>
      </div>
      <div className="card">
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
      <div className="card" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn-primary" onClick={onApply}>
          Apply
        </button>
      </div>
    </div>
  );
}

export default FilterMain;
