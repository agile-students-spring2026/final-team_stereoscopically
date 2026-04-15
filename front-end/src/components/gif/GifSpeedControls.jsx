import { GIF_SPEED_OPTIONS } from './gifSpeedOptions'

function GifSpeedControls({ selectedSpeedPlaybackRate, onSelectSpeed, onBack, onCancel }) {
  return (
    <div className="preset-sizes-screen">
      <div className="screen-header screen-header-column">
        <h2 className="screen-title">Speed</h2>
        <p className="screen-subtitle">Choose playback speed for this GIF flow.</p>
      </div>

      <div className="card filter-main-buttons">
        {GIF_SPEED_OPTIONS.map((option) => {
          const isActive = option.playbackRate === selectedSpeedPlaybackRate

          return (
            <button
              key={option.id}
              type="button"
              className={`btn-secondary${isActive ? ' active' : ''}`}
              onClick={() => onSelectSpeed?.(option.playbackRate)}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      <div className="card-actions preset-sizes-screen-actions">
        <button type="button" className="btn-secondary" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn-primary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default GifSpeedControls
