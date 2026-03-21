import { useState } from 'react';
import ImagePreview from './components/imagePreview';

function AddText({ imageSrc, onApply, onCancel }) {
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
        {/* <span style={{ color: '#999', fontSize: '0.9rem' }}>Preview of Creation</span> */}
        <ImagePreview src={imageSrc} />      
      </div>
      <div className="card">
        <label>
          <input
            type="text"
            placeholder="Enter text here"
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{
              width: '100%',
              maxWidth: 280,
              padding: '0.5rem',
              marginBottom: '0.5rem',
              border: '1px solid #1a1a1a',
            }}
          />
        </label>
        <div style={{ marginBottom: '0.5rem' }}>
          <span>Font: </span>
          <select
            value={font}
            onChange={(e) => setFont(e.target.value)}
            style={{ padding: '0.25rem', border: '1px solid #1a1a1a' }}
          >
            <option value="Arial">Arial</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Georgia">Georgia</option>
          </select>
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <span>Size: </span>
          {['small', 'medium', 'large'].map((s) => (
            <button
              key={s}
              type="button"
              className="btn-secondary"
              style={{ margin: '0.1rem', textTransform: 'capitalize' }}
              onClick={() => setSize(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <span>Position: </span>
          {['top', 'center', 'bottom'].map((p) => (
            <button
              key={p}
              type="button"
              className="btn-secondary"
              style={{ margin: '0.1rem', textTransform: 'capitalize' }}
              onClick={() => setPosition(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="card" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
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
