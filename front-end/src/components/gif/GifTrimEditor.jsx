import { useEffect, useMemo, useRef, useState } from 'react'

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

  const videoUrl = useMemo(() => {
    if (!videoFile) return null
    if (videoFile instanceof File) return URL.createObjectURL(videoFile)
    return videoFile?.url || videoFile?.src || null
  }, [videoFile])

  useEffect(() => {
    if (!(videoFile instanceof File) || !videoUrl) return
    return () => {
      window.setTimeout(() => {
        URL.revokeObjectURL(videoUrl)
      }, 0)
    }
  }, [videoFile, videoUrl])

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
      trimStart: draftTrimStart,
      trimEnd: draftTrimEnd,
    })
  }

  return (
    <div className="preset-sizes-screen">
      <div className="screen-header screen-header-column">
        <h2 className="screen-title">Trim</h2>
        <p className="screen-subtitle">Choose the segment you want to keep for GIF export.</p>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            className="preview-video"
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
          <p className="preview-label" style={{ margin: 0, textAlign: 'center' }}>
            Upload a video to start editing.
          </p>
        )}
      </div>

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
                step={0.1}
                value={draftTrimStart}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  setDraftTrimStart(val)
                  if (videoRef.current) videoRef.current.currentTime = val
                }}
                style={{ width: '100%', accentColor: '#ffd60a' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.9rem' }}>
              End
              <input
                type="range"
                min={draftTrimStart}
                max={duration}
                step={0.1}
                value={draftTrimEnd}
                onChange={(e) => setDraftTrimEnd(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#ffd60a' }}
              />
            </label>
          </>
        ) : (
          <p className="preview-label" style={{ margin: 0, textAlign: 'center' }}>
            Loading trim controls…
          </p>
        )}
      </div>

      <div className="card-actions preset-sizes-screen-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
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
      </div>
    </div>
  )
}

export default GifTrimEditor