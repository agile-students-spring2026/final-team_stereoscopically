import { useEffect, useState } from 'react'

const DEFAULT_GIF_RESIZE_PRESET = 'square'

const GIF_RESIZE_PRESET_OPTIONS = [
  {
    key: 'square',
    label: 'Square',
    subtitle: '1:1',
  },
  {
    key: 'landscape',
    label: 'Landscape',
    subtitle: '16:9',
  },
  {
    key: 'portrait',
    label: 'Portrait',
    subtitle: '9:16',
  },
]

function GifResizePresets({
  initialPreset = DEFAULT_GIF_RESIZE_PRESET,
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

  const handleReset = () => {
    setSelectedPreset(DEFAULT_GIF_RESIZE_PRESET)
  }

  return (
    <div className="preset-sizes-screen">
      <div className="screen-header screen-header-column">
        <h2 className="screen-title">Resize</h2>
        <p className="screen-subtitle">Choose a preset output shape for this GIF.</p>
      </div>

      <div className="card filter-main-buttons">
        {GIF_RESIZE_PRESET_OPTIONS.map((option) => {
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
        <button type="button" className="btn-secondary" onClick={handleReset}>
          Reset
        </button>
        <button type="button" className="btn-primary" onClick={handleApply}>
          Apply
        </button>
      </div>
    </div>
  )
}

export default GifResizePresets