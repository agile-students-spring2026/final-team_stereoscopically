import { useEffect, useMemo, useState } from 'react'

const DEFAULT_TEXT_OVERLAY_SETTINGS = {
  text: '',
  size: 32,
  color: '#FFFFFF',
  position: { x: 50, y: 50 },
}

const asNumberOrFallback = (value, fallback) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function GifTextOverlayEditor({ initialSettings, onBack, onCancel, onApply, onChange }) {
  const safeInitial = useMemo(() => ({
    ...DEFAULT_TEXT_OVERLAY_SETTINGS,
    ...initialSettings,
    position: {
      ...DEFAULT_TEXT_OVERLAY_SETTINGS.position,
      ...(initialSettings?.position || {}),
    },
  }), [initialSettings])

  const [draft, setDraft] = useState(safeInitial)

  useEffect(() => {
    setDraft(safeInitial)
  }, [safeInitial])

  const updateDraft = (partial) => {
    setDraft((current) => {
      const next = {
        ...current,
        ...partial,
        position: {
          ...current.position,
          ...(partial?.position || {}),
        },
      }

      onChange?.(next)
      return next
    })
  }

  return (
    <div className="preset-sizes-screen">
      <div className="screen-header screen-header-column">
        <h2 className="screen-title">Text</h2>
        <p className="screen-subtitle">Add simple text for this GIF. Changes stay synced with the active flow.</p>
      </div>

      <div className="card" style={{ display: 'grid', gap: '0.75rem' }}>
        <label htmlFor="gif-text-content" className="add-text-label">Text content</label>
        <textarea
          id="gif-text-content"
          rows={3}
          className="text-input add-text-input"
          placeholder="Type GIF text"
          value={draft.text}
          onChange={(event) => updateDraft({ text: event.target.value })}
        />

        <label htmlFor="gif-text-size" className="add-text-label">Size</label>
        <input
          id="gif-text-size"
          type="number"
          min={8}
          max={120}
          className="text-input add-text-size-input"
          value={draft.size}
          onChange={(event) => updateDraft({ size: asNumberOrFallback(event.target.value, draft.size) })}
        />

        <label htmlFor="gif-text-color" className="add-text-label">Color</label>
        <div className="add-text-color-controls">
          <input
            id="gif-text-color"
            type="color"
            className="add-text-color-input"
            value={draft.color}
            onChange={(event) => updateDraft({ color: event.target.value })}
          />
          <span className="add-text-color-value">{String(draft.color || '').toUpperCase()}</span>
        </div>

        <label htmlFor="gif-text-position-x" className="add-text-label">Horizontal position ({Math.round(asNumberOrFallback(draft.position?.x, 50))}%)</label>
        <input
          id="gif-text-position-x"
          type="range"
          min={0}
          max={100}
          value={asNumberOrFallback(draft.position?.x, 50)}
          onChange={(event) => updateDraft({ position: { x: asNumberOrFallback(event.target.value, 50) } })}
        />

        <label htmlFor="gif-text-position-y" className="add-text-label">Vertical position ({Math.round(asNumberOrFallback(draft.position?.y, 50))}%)</label>
        <input
          id="gif-text-position-y"
          type="range"
          min={0}
          max={100}
          value={asNumberOrFallback(draft.position?.y, 50)}
          onChange={(event) => updateDraft({ position: { y: asNumberOrFallback(event.target.value, 50) } })}
        />
      </div>

      <div className="card-actions preset-sizes-screen-actions">
        <button type="button" className="btn-secondary" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn-primary" onClick={() => onApply?.(draft)}>
          Apply
        </button>
      </div>
    </div>
  )
}

export default GifTextOverlayEditor
