const PRESET_SIZES = [
  { id: 'discord-emoji', label: 'Discord Emoji', width: 128, height: 128 },
  { id: 'discord-sticker', label: 'Discord Sticker', width: 320, height: 128 },
  { id: 'whatsapp', label: 'WhatsApp Sticker', width: 512, height: 512 },
  { id: 'imessage', label: 'iMessage Sticker', width: 300, height: 300 },
  { id: 'custom', label: 'Custom Size', width: null, height: null },
];

function PresetSizes({ onSelect, onCancel }) {
  return (
    <div className="app-container">
      <div className="screen-header">
        <div className="app-logo">StickerCreate</div>
        <h2 className="screen-title">Select Platform</h2>
        <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.25rem' }}>
          Choose where you want to use your sticker
        </p>
      </div>
      <div className="card">
        {PRESET_SIZES.map(({ id, label, width, height }) => (
          <button
            key={id}
            type="button"
            className="btn-primary"
            onClick={() => onSelect({ id, label, width, height })}
          >
            {label}
            {width && height ? ` (${width} × ${height})` : ''}
          </button>
        ))}
      </div>
      <div className="card">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default PresetSizes;
