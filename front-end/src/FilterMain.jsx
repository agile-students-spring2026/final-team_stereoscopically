import ImagePreview from './components/ImagePreview.jsx'

function FilterMain({ onPresetFilters, onAddText, onColorFilters }) {
  return (
    <div className="app-container">
      <div className="screen-header">
        <div className="app-logo">StickerCreate</div>
        <h2 className="screen-title">Filters</h2>
      </div>

      <div className="preview-section">
              <ImagePreview src={imageSrc} />
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
