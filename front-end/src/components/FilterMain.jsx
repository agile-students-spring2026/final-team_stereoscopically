import ImagePreview from "./ImagePreview";

function FilterMain({ imageSrc, onPresetFilters, onAddText, onColorFilters, onCancel }) {
  return (
    <div className="app-container">
      <div className="screen-header">
        <div className="app-logo">StickerCreate</div>
        <h2 className="screen-title">Filters</h2>
      </div>

      <div className="preview-box">
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
      <div className="card-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>        
      </div>
    </div>
  );
}

export default FilterMain;
