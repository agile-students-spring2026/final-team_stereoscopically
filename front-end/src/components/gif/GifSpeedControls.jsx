import { useRef } from 'react'
import { GIF_SPEED_OPTIONS } from './gifSpeedOptions'
import useVideoPreviewUrl from '../../hooks/useVideoPreviewUrl'
import EditorToolScreen from '../EditorToolScreen'

function GifSpeedControls({
  videoFile,
  selectedSpeedPlaybackRate,
  onSelectSpeed,
  onApplySpeed,
  onBack,
  onCancel,
}) {
  const previewVideoRef = useRef(null)
  const videoUrl = useVideoPreviewUrl(videoFile)

  const handleSpeedChange = (playbackRate) => {
    onSelectSpeed?.(playbackRate)
    if (previewVideoRef.current) {
      previewVideoRef.current.playbackRate = playbackRate
    }
  }

  return (
    <EditorToolScreen
      title="Speed"
      subtitle="Choose playback speed for this GIF."
      preview={videoUrl ? (
        <div className="editor-preview editor-preview--checkered">
          <video
            ref={previewVideoRef}
            src={videoUrl}
            controls
            className="editor-preview-media"
            onLoadedMetadata={() => {
              if (previewVideoRef.current) {
                previewVideoRef.current.playbackRate = selectedSpeedPlaybackRate
              }
            }}
          />
        </div>
      ) : null}
      controls={(
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
      )}
      actions={(
        <>
          <button type="button" className="btn-secondary" onClick={onBack}>
            Filter menu
          </button>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Back to editor
          </button>
          <button type="button" className="btn-primary" onClick={() => onApplySpeed?.(selectedSpeedPlaybackRate)}>
            Apply
          </button>
        </>
      )}
    />
  )
}

export default GifSpeedControls
