const PRESET_SIZES = [
  { id: 'discord-emoji', label: 'Discord Emoji', width: 128, height: 128 },
  { id: 'discord-sticker', label: 'Discord Sticker', width: 320, height: 320 },
  { id: 'whatsapp', label: 'WhatsApp Sticker', width: 512, height: 512 },
  { id: 'imessage', label: 'iMessage Sticker', width: 408, height: 408 },
]

const LETTERBOX_SWATCHES = [
  { id: 'transparent', label: 'Transparent', value: 'transparent' },
  { id: 'white', label: 'White', value: '#ffffff' },
  { id: 'black', label: 'Black', value: '#000000' },
]

function PresetSizes({ letterboxColor, onLetterboxColorChange, onSelect, onCancel, isBusy = false }) {
  return (
    <div className="editor-tool-screen">
      <div className="screen-header screen-header-column">
        <h2 className="screen-title">Platform output (pixels)</h2>
      </div>
      <div className="preset-letterbox card">
        <p className="preset-letterbox-label">Letterbox / margins</p>
        <p className="preset-letterbox-hint">
          After you pick a platform size, changing margin color updates the main preview automatically.
        </p>
        <div className="preset-letterbox-row">
          {LETTERBOX_SWATCHES.map(({ id, label, value }) => (
            <button
              key={id}
              type="button"
              className={letterboxColor === value ? 'btn-primary' : 'btn-secondary'}
              onClick={() => onLetterboxColorChange(value)}
              disabled={isBusy}
            >
              {label}
            </button>
          ))}
          <label className="preset-letterbox-custom">
            <span className="preset-letterbox-custom-label">Custom</span>
            <input
              type="color"
              className="preset-letterbox-color-input"
              value={letterboxColor === 'transparent' ? '#ffffff' : letterboxColor}
              onChange={(e) => onLetterboxColorChange(e.target.value.toLowerCase())}
              disabled={isBusy}
              aria-label="Custom letterbox color"
            />
          </label>
        </div>
      </div>
      <div className="card filter-main-buttons">
        {PRESET_SIZES.map(({ id, label, width, height }) => (
          <button
            key={id}
            type="button"
            className="btn-primary"
            onClick={() => onSelect({ id, label, width, height })}
            disabled={isBusy}
          >
            {label} ({width} × {height} px)
          </button>
        ))}
        <button type="button" className="btn-secondary editor-tool-cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default PresetSizes
