import { useMemo, useState } from 'react'
import FilterScreen from './FilterScreen'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const PREVIEW_FONT_SIZE = {
  small: 16,
  medium: 24,
  large: 32,
}

const BACKEND_FONT_SIZE = {
  small: 520,
  medium: 760,
  large: 980,
}

const DEFAULT_TEXT_COLOR = '#111111'

function AddText({ imageSrc, onApply, onCancel, applyError = null }) {
  const [text, setText] = useState('')
  const [font, setFont] = useState('Arial')
  const [size, setSize] = useState('medium')
  const [placement, setPlacement] = useState({ x: 0.5, y: 0.5 })

  const previewFontSize = PREVIEW_FONT_SIZE[size] ?? PREVIEW_FONT_SIZE.medium
  const previewText = useMemo(() => text || 'Click where you want text', [text])

  const updatePlacementFromPointer = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1)
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1)

    setPlacement({ x, y })
  }

  const handleApply = () => {
    onApply?.({
      text,
      font,
      size,
      fontFamily: font,
      fontSize: BACKEND_FONT_SIZE[size] ?? BACKEND_FONT_SIZE.medium,
      color: DEFAULT_TEXT_COLOR,
      x: placement.x,
      y: placement.y,
    })
  }

  return (
    <FilterScreen
      title="Add Text"
      imageSrc={imageSrc}
      onApply={handleApply}
      onCancel={onCancel}
      previewInteractive
      onPreviewPointerDown={updatePlacementFromPointer}
      onPreviewPointerMove={(event) => {
        if (event.buttons !== 1) return
        updatePlacementFromPointer(event)
      }}
      previewOverlay={(
        <div
          className="add-text-placement-marker"
          style={{
            left: `${placement.x * 100}%`,
            top: `${placement.y * 100}%`,
            fontFamily: font,
            fontSize: `${previewFontSize}px`,
            color: DEFAULT_TEXT_COLOR,
          }}
        >
          {previewText}
        </div>
      )}
    >
      <div className="add-text-form">
        {applyError ? (
          <p role="alert" className="upload-status" style={{ marginTop: 0, color: '#ff3b30' }}>
            {applyError}
          </p>
        ) : null}

        <div className="add-text-field add-text-field--stack">
          <label htmlFor="add-text-input" className="add-text-label">
            Text
          </label>
          <textarea
            id="add-text-input"
            rows={3}
            placeholder="Enter text here (multi-line supported)"
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

        <div className="add-text-field add-text-field--stack">
          <span className="add-text-label">Placement</span>
          <p className="add-text-placement-hint">Click or drag on the preview above to place your text.</p>
        </div>
      </div>
    </FilterScreen>
  )
}

export default AddText
