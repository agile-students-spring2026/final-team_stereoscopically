import { useState } from 'react'
import FilterScreen from './FilterScreen'

function AddText({ imageSrc, onApply, onCancel }) {
  const [text, setText] = useState('')
  const [font, setFont] = useState('Arial')
  const [size, setSize] = useState('medium')
  const [position, setPosition] = useState('center')

  const handleApply = () => {
    onApply?.({ text, font, size, position })
  }

  return (
    <FilterScreen
      title="Add Text"
      imageSrc={imageSrc}
      onApply={handleApply}
      onCancel={onCancel}
    >
      <div className="add-text-form">
        <div className="add-text-field add-text-field--stack">
          <label htmlFor="add-text-input" className="add-text-label">
            Text
          </label>
          <input
            id="add-text-input"
            type="text"
            placeholder="Enter text here"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="text-input add-text-input"
          />
        </div>

        <div className="add-text-field add-text-field--grid">
          <span className="add-text-label">Font</span>
          <select
            value={font}
            onChange={(e) => setFont(e.target.value)}
            className="form-select add-text-select"
          >
            <option value="Arial">Arial</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Georgia">Georgia</option>
          </select>
        </div>

        <div className="add-text-field add-text-field--grid">
          <span className="add-text-label">Size</span>
          <div className="add-text-button-group">
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
        </div>

        <div className="add-text-field add-text-field--grid">
          <span className="add-text-label">Position</span>
          <div className="add-text-button-group">
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
      </div>
    </FilterScreen>
  )
}

export default AddText
