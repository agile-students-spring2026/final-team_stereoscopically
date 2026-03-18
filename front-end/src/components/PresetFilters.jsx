import { useState } from 'react';

function PresetFilters({ onApply, onCancel }) {
  const [selectedStyle, setSelectedStyle] = useState('default');

  return (
    <div className="app-container">
      <div className="screen-header">
        <div className="app-logo">StickerCreate</div>
        <h2 className="screen-title">Preset Filters</h2>
      </div>
      <div className="preview-box">
        <span className="preview-label">Preview of Creation</span>
      </div>
      <div className="card">
        {['default', 'style1', 'style2'].map((style) => (
          <button
            key={style}
            type="button"
            className={`btn-secondary preset-filters-button ${selectedStyle === style ? 'active' : ''}`}
            onClick={() => setSelectedStyle(style)}
          >
            {style === 'style1' ? 'Style 1' : style === 'style2' ? 'Style 2' : 'Default'}
          </button>
        ))}
      </div>
      <div className="preset-filters-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn-primary" onClick={() => onApply(selectedStyle)}>
          Apply
        </button>
      </div>
    </div>
  );
}

export default PresetFilters;
