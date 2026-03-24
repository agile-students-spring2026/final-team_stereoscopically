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
    </FilterScreen>
  )
}

export default AddText
