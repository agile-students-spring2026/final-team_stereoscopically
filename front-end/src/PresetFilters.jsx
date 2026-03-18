import { useState } from 'react';
import ImagePreview from './components/imagePreview';

function PresetFilters({ imageSrc, onApply, onCancel }) {
  const [selectedStyle, setSelectedStyle] = useState('default');

  return (
    <div className="app-container">
      <div className="screen-header">
        <div className="app-logo">StickerCreate</div>
        <h2 className="screen-title">Preset Filters</h2>
      </div>
      <div className="preview-box">
        {/* <span style={{ color: '#999', fontSize: '0.9rem' }}>Preview of Creation</span> */}

        <ImagePreview src={imageSrc} />      
        </div>
      <div className="card">
        {['default', 'style1', 'style2'].map((style) => (
          <button
            key={style}
            type="button"
            className={`btn-secondary ${selectedStyle === style ? 'active' : ''}`}
            style={{ margin: '0.25rem', textTransform: 'capitalize' }}
            onClick={() => setSelectedStyle(style)}
          >
            {style === 'style1' ? 'Style 1' : style === 'style2' ? 'Style 2' : 'Default'}
          </button>
        ))}
      </div>
      <div className="card" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
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
