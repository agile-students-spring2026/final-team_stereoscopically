import { useEffect, useState } from 'react'

const GIF_RESIZE_PRESETS = {
  SQUARE: 'square',
  LANDSCAPE: 'landscape',
  PORTRAIT: 'portrait',
}

const PRESET_OPTIONS = [
  {
    key: GIF_RESIZE_PRESETS.SQUARE,
    label: 'Square',
    subtitle: '1:1',
  },
  {
    key: GIF_RESIZE_PRESETS.LANDSCAPE,
    label: 'Landscape',
    subtitle: '16:9',
  },
  {
    key: GIF_RESIZE_PRESETS.PORTRAIT,
    label: 'Portrait',
    subtitle: '9:16',
  },
]

function GifResizePresets({
  initialPreset = GIF_RESIZE_PRESETS.SQUARE,
  onApply,
  onBack,
  onCancel,
}) {
  const [selectedPreset, setSelectedPreset] = useState(initialPreset)

  useEffect(() => {
    setSelectedPreset(initialPreset)
  }, [initialPreset])

  const handleApply = () => {
    onApply?.(selectedPreset)
  }

  return (
    <div className="preset-sizes-screen">
      <div className="screen-header screen-header-column">
        <h2 className="screen-title">Resize</h2>
        <p className="screen-subtitle">Choose a preset output shape for this GIF.</p>
      </div>

      <div className="card filter-main-buttons">
        {PRESET_OPTIONS.map((option) => {
          const isActive = selectedPreset === option.key
          return (
            <button
              key={option.key}
              type="button"
              className={isActive ? 'btn-secondary active' : 'btn-secondary'}
              onClick={() => setSelectedPreset(option.key)}
            >
              {option.label} ({option.subtitle})
            </button>
          )
        })}
      </div>

      <div className="card-actions preset-sizes-screen-actions">
        <button type="button" className="btn-secondary" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn-primary" onClick={handleApply}>
          Apply
        </button>
      </div>
    </div>
  )
}

export default GifResizePresets