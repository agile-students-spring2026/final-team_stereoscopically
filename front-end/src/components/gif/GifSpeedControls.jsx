import { useRef } from 'react'
import { GIF_SPEED_OPTIONS } from './gifSpeedOptions'

function GifSpeedControls({ videoFile, selectedSpeedPlaybackRate, onSelectSpeed, onApplySpeed }) {
  const previewVideoRef = useRef(null)

  const getVideoUrl = () => {
    if (!videoFile) return null
    if (videoFile instanceof File) {
      return URL.createObjectURL(videoFile)
    }
    if (typeof videoFile === 'string') return videoFile
    if (typeof videoFile === 'object') {
      return videoFile.url || videoFile.src || videoFile.source || videoFile.fullUrl || null
    }
    return null
  }

  const videoUrl = getVideoUrl()

  const handleSpeedChange = (playbackRate) => {
    onSelectSpeed?.(playbackRate)
    if (previewVideoRef.current) {
      previewVideoRef.current.playbackRate = playbackRate
    }
  }

  return (
    <div className="preset-sizes-screen">
      <div className="screen-header screen-header-column">
        <h2 className="screen-title">Speed</h2>
        <p className="screen-subtitle">Choose playback speed for this GIF.</p>
      </div>

      {videoUrl && (
        <div className="preview-box editor-preview preview-box-checkered editor-preview--checkered">
          <video
            ref={previewVideoRef}
            src={videoUrl}
            controls
            className="preview-video editor-preview-media"
            onLoadedMetadata={() => {
              if (previewVideoRef.current) {
                previewVideoRef.current.playbackRate = selectedSpeedPlaybackRate
              }
            }}
          />
        </div>
      )}

      <div className="card filter-main-buttons">
        {GIF_SPEED_OPTIONS.map((option) => {
          const isActive = option.playbackRate === selectedSpeedPlaybackRate

          return (
            <button
              key={option.id}
              type="button"
              className={`btn-secondary${isActive ? ' active' : ''}`}
              onClick={() => handleSpeedChange(option.playbackRate)}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      <div className="card-actions editor-actions editor-actions--inline preset-sizes-screen-actions">
        <button type="button" className="btn-primary" onClick={() => onApplySpeed?.(selectedSpeedPlaybackRate)}>
          Apply
        </button>
      </div>
    </div>
  )
}

export default GifSpeedControls
