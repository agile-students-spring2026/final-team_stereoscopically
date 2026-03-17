function ImageEditor({ onSize, onReframe, onFilters, onExport, onCancel }) {
  return (
    <div className="app-container">
      <div className="screen-header">
        <div className="app-logo">StickerCreate</div>
        <h2 className="screen-title">Image Editor</h2>
      </div>
      <div className="preview-box">
        <span style={{ color: '#999', fontSize: '0.9rem' }}>Preview of Creation</span>
      </div>
      <div className="card" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="btn-secondary" onClick={onSize}>
          Size
        </button>
        <button type="button" className="btn-secondary" onClick={onReframe}>
          Reframe
        </button>
        <button type="button" className="btn-secondary" onClick={onFilters}>
          Filters
        </button>
      </div>
      <div className="card" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
        <button type="button" className="btn-primary" onClick={onExport}>
          Export
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default ImageEditor;
