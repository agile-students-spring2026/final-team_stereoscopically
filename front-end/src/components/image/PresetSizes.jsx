import { useMemo, useState } from 'react'
import EditorToolScreen from '../EditorToolScreen'
import EditorStatus from '../EditorStatus'

const PRESET_SIZES = [
  { id: 'discord-emoji', label: 'Discord Emoji', width: 128, height: 128 },
  { id: 'discord-sticker', label: 'Discord Sticker', width: 320, height: 320 },
  { id: 'whatsapp', label: 'WhatsApp Sticker', width: 512, height: 512 },
  { id: 'imessage', label: 'iMessage Sticker', width: 408, height: 408 },
]

const DEFAULT_IMAGE_RESIZE_PRESET_ID = PRESET_SIZES[0].id
const DEFAULT_IMAGE_RESIZE_BORDER_COLOR = 'transparent'

const LETTERBOX_SWATCHES = [
  { id: 'transparent', label: 'Transparent', value: 'transparent' },
  { id: 'white', label: 'White', value: '#ffffff' },
  { id: 'black', label: 'Black', value: '#000000' },
]

function PresetSizes({
  imageSrc,
  initialPreset = null,
  initialLetterboxColor = DEFAULT_IMAGE_RESIZE_BORDER_COLOR,
  onApply,
  onCancel,
  isBusy = false,
}) {
  const [selectedPresetId, setSelectedPresetId] = useState(initialPreset?.id || DEFAULT_IMAGE_RESIZE_PRESET_ID)
  const [selectedBorderColor, setSelectedBorderColor] = useState(initialLetterboxColor)

  const selectedPreset = useMemo(
    () => PRESET_SIZES.find(({ id }) => id === selectedPresetId) || PRESET_SIZES[0],
    [selectedPresetId]
  )

  const handleReset = () => {
    setSelectedPresetId(DEFAULT_IMAGE_RESIZE_PRESET_ID)
    setSelectedBorderColor(DEFAULT_IMAGE_RESIZE_BORDER_COLOR)
  }

  const handleApply = () => {
    if (!selectedPreset) return
    onApply?.({
      preset: selectedPreset,
      letterboxColor: selectedBorderColor,
    })
  }

  const previewAspectRatio = `${selectedPreset.width} / ${selectedPreset.height}`

  return (
    <EditorToolScreen
      title="Resize"
      subtitle="Choose a size and border color, then apply."
      preview={(
        <div className="card gif-resize-preview-card editor-preview--checkered">
          {imageSrc ? (
            <div
              className="image-resize-preview-frame"
              style={{
                aspectRatio: previewAspectRatio,
                backgroundColor: selectedBorderColor,
              }}
            >
              <img src={imageSrc} alt="Resize preview" className="editor-preview-media image-resize-preview-media" />
            </div>
          ) : (
            <EditorStatus centered>Upload an image to preview resize.</EditorStatus>
          )}
        </div>
      )}
      controls={(
        <div className="card filter-main-buttons">
          {PRESET_SIZES.map(({ id, label, width, height }) => {
            const isActive = selectedPresetId === id
            return (
              <button
                key={id}
                type="button"
                className={isActive ? 'btn-secondary active gif-preset-option is-selected' : 'btn-secondary gif-preset-option'}
                aria-pressed={isActive}
                onClick={() => setSelectedPresetId(id)}
                disabled={isBusy}
              >
                {label} ({width} × {height} px)
              </button>
            )
          })}

          <div className="preset-letterbox resize-border-controls">
            <p className="preset-letterbox-label">Border color</p>
            <div className="preset-letterbox-row">
              {LETTERBOX_SWATCHES.map(({ id, label, value }) => {
                const isActive = selectedBorderColor === value
                return (
                  <button
                    key={id}
                    type="button"
                    className={isActive ? 'btn-secondary active gif-preset-option is-selected' : 'btn-secondary gif-preset-option'}
                    aria-pressed={isActive}
                    onClick={() => setSelectedBorderColor(value)}
                    disabled={isBusy}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            <div className="preset-letterbox-custom">
              <span className="preset-letterbox-custom-label">Custom</span>
              <input
                type="color"
                className="preset-letterbox-color-input"
                value={selectedBorderColor === 'transparent' ? '#ffffff' : selectedBorderColor}
                onChange={(event) => setSelectedBorderColor(event.target.value.toLowerCase())}
                disabled={isBusy}
                aria-label="Custom border color"
              />
              <span className="add-text-color-value">{selectedBorderColor.toUpperCase()}</span>
            </div>
          </div>
        </div>
      )}
      actions={(
        <>
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={isBusy}>
            Cancel
          </button>
          <button type="button" className="btn-secondary" onClick={handleReset} disabled={isBusy}>
            Reset
          </button>
          <button type="button" className="btn-primary" onClick={handleApply} disabled={isBusy || !selectedPreset}>
            {isBusy ? 'Applying...' : 'Apply'}
          </button>
        </>
      )}
    />
  )
}

export default PresetSizes
