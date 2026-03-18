import { useState } from 'react';

function ColorFilters({ onApply, onCancel }) {
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [sharpness, setSharpness] = useState(100);

  return (
    <div className="app-container">
      <div className="screen-header">
        <div className="app-logo">StickerCreate</div>
        <h2 className="screen-title">Color Filters</h2>
      </div>
      <div className="preview-box">
        <span className="preview-label">Preview of Creation</span>
      </div>
      <div className="card">
        <div>
          <label>
            Brightness: {brightness}%
            <input
              type="range"
              min="0"
              max="200"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="slider-wrapper"
            />
          </label>
        </div>
        <div>
          <label>
            Contrast: {contrast}%
            <input
              type="range"
              min="0"
              max="200"
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
              className="slider-wrapper"
            />
          </label>
        </div>
        <div>
          <label>
            Saturation: {saturation}%
            <input
              type="range"
              min="0"
              max="200"
              value={saturation}
              onChange={(e) => setSaturation(Number(e.target.value))}
              className="slider-wrapper"
            />
          </label>
        </div>
        <div>
          <label>
            Sharpness: {sharpness}%
            <input
              type="range"
              min="0"
              max="200"
              value={sharpness}
              onChange={(e) => setSharpness(Number(e.target.value))}
              className="slider-wrapper"
            />
          </label>
        </div>
      </div>
      <div className="color-filters-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() =>
            onApply({ brightness, contrast, saturation, sharpness })
          }
        >
          Apply
        </button>
      </div>
    </div>
  );
}

export default ColorFilters;
