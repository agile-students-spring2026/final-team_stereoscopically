import { useRef, useState } from 'react'
import EditorToolScreen from '../EditorToolScreen'
import EditorStatus from '../EditorStatus'
import useVideoPreviewUrl from '../../hooks/useVideoPreviewUrl'

const TRIM_STEP = 0.1

function GifTrimEditor({
  videoFile,
  initialTrimStart = 0,
  initialTrimEnd = 0,
  onApply,
  onCancel,
}) {
  const [duration, setDuration] = useState(0)
  const [draftTrimStart, setDraftTrimStart] = useState(0)
  const [draftTrimEnd, setDraftTrimEnd] = useState(0)

  const videoRef = useRef(null)
  const videoUrl = useVideoPreviewUrl(videoFile)

  const formatTime = (s) => `${s.toFixed(1)}s`

  const handleReset = () => {
    if (duration <= 0) return
    setDraftTrimStart(0)
    setDraftTrimEnd(duration)
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.pause()
    }
  }

  const handleApply = () => {
    onApply?.({
      start: Number(draftTrimStart.toFixed(1)),
      end: Number(draftTrimEnd.toFixed(1)),
    })
  }

  const handleStartChange = (value) => {
    const numericValue = Number(value)
    const maxStart = Math.max(0, draftTrimEnd - TRIM_STEP)
    const safeStart = Math.min(Math.max(numericValue, 0), maxStart)
    setDraftTrimStart(safeStart)
    if (videoRef.current) videoRef.current.currentTime = safeStart
  }

  const handleEndChange = (value) => {
    const numericValue = Number(value)
    const minEnd = Math.min(duration, draftTrimStart + TRIM_STEP)
    const safeEnd = Math.max(minEnd, Math.min(numericValue, duration))
    setDraftTrimEnd(safeEnd)
  }

  return (
    <EditorToolScreen
      title="Trim"
      preview={(
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="editor-preview-media"
              onLoadedMetadata={() => {
                const total = Number.isFinite(videoRef.current?.duration)
                  ? videoRef.current.duration
                  : 0

                const safeStart = Math.min(Math.max(initialTrimStart, 0), total)
                const candidateEnd = initialTrimEnd > 0 ? initialTrimEnd : total
                const safeEnd = Math.min(Math.max(candidateEnd, safeStart), total)

                setDuration(total)
                setDraftTrimStart(safeStart)
                setDraftTrimEnd(safeEnd)
              }}
              onTimeUpdate={() => {
                if (draftTrimEnd > 0 && videoRef.current && videoRef.current.currentTime >= draftTrimEnd) {
                  videoRef.current.pause()
                  videoRef.current.currentTime = draftTrimStart
                }
              }}
            />
          ) : (
            <EditorStatus centered>Upload a video to start editing.</EditorStatus>
          )}
        </div>
      )}
      controls={(
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {duration > 0 ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '60px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#8e8e93', textTransform: 'uppercase' }}>
                    Start
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{formatTime(draftTrimStart)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#8e8e93', textTransform: 'uppercase' }}>
                    End
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{formatTime(draftTrimEnd)}</div>
                </div>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.9rem' }}>
                Start
                <input
                  type="range"
                  min={0}
                  max={draftTrimEnd}
                  step={TRIM_STEP}
                  value={draftTrimStart}
                  onChange={(e) => handleStartChange(e.target.value)}
                  className="editor-slider"
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.9rem' }}>
                End
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={TRIM_STEP}
                  value={draftTrimEnd}
                  onChange={(e) => handleEndChange(e.target.value)}
                  className="editor-slider"
                />
              </label>
            </>
          ) : (
            <EditorStatus tone="loading" centered>
              Loading trim controls…
            </EditorStatus>
          )}
        </div>
      )}
      actions={(
        <>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Back to editor
          </button>
          <button type="button" className="btn-secondary" onClick={handleReset} disabled={duration <= 0}>
            Reset
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleApply}
            disabled={duration <= 0 || draftTrimEnd <= draftTrimStart}
          >
            Apply
          </button>
        </>
      )}
    />
  )
}

export default GifTrimEditor