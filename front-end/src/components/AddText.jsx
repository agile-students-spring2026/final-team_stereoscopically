import { useState } from 'react';

function AddText({ onApply, onCancel }) {
  const [text, setText] = useState('');
  const [font, setFont] = useState('Arial');
  const [size, setSize] = useState('medium');
  const [position, setPosition] = useState('center');

  return (
    <div className="app-container">
      <div className="screen-header">
        <div className="app-logo">StickerCreate</div>
        <h2 className="screen-title">Add Text</h2>
      </div>
      <div className="preview-box">
        <span className="preview-label">Preview of Creation</span>
      </div>
      <div className="card">
        <label>
          <input
            type="text"
            placeholder="Enter text here"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="text-input"
          />
        </label>
        <div className="form-group">
          <span>Font: </span>
          <select
            value={font}
            onChange={(e) => setFont(e.target.value)}
            className="form-select"
          >
            <option value="Arial">Arial</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Georgia">Georgia</option>
          </select>
        </div>
        <div className="form-group">
          <span>Size: </span>
          {['small', 'medium', 'large'].map((s) => (
            <button
              key={s}
              type="button"
              className={`btn-secondary ${size === s ? 'active' : ''}`}
              onClick={() => setSize(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="form-group">
          <span>Position: </span>
          {['top', 'center', 'bottom'].map((p) => (
            <button
              key={p}
              type="button"
              className={`btn-secondary ${position === p ? 'active' : ''}`}
              onClick={() => setPosition(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="card-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => onApply({ text, font, size, position })}
        >
          Apply
        </button>
      </div>
    </div>
  );
}

export default AddText;
