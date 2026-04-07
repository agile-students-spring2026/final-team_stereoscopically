const PRESET_SIZES = [
  { id: 'emoji-square', label: 'Emoji (Square)', width: 128, height: 128 },
  { id: 'sticker-square', label: 'Sticker (Square)', width: 512, height: 512 },
  { id: 'wide-sticker', label: 'Wide Sticker', width: 320, height: 128 },
  { id: 'instagram-story', label: 'Instagram Story', width: 1080, height: 1920 },
];

function PresetSizes({ onSelect, onCancel }) {
  return (
    <div className="preset-sizes-screen">
      <div className="screen-header screen-header-column">
        <h2 className="screen-title">Preset Sizes</h2>
      </div>
      <div className="card filter-main-buttons">
        {PRESET_SIZES.map(({ id, label, width, height }) => (
          <button
            key={id}
            type="button"
            className="btn-primary"
            onClick={() => onSelect({ id, label, width, height })}
          >
            {label} ({width} × {height})
          </button>
        ))}
        <button type="button" className="btn-secondary preset-sizes-cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default PresetSizes;
