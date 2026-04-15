import { useEffect, useMemo, useState } from 'react'
import EditorToolScreen from '../EditorToolScreen'

const DEFAULT_GIF_RESIZE_PRESET = 'square'

const GIF_RESIZE_PRESET_OPTIONS = [
  {
    key: 'square',
    label: 'Square',
    subtitle: '1:1',
  },
  {
    key: 'landscape',
    label: 'Landscape',
    subtitle: '16:9',
  },
  {
    key: 'portrait',
    label: 'Portrait',
    subtitle: '9:16',
  },
]

const DEFAULT_GIF_RESIZE_BORDER_COLOR = '#000000'
const GIF_RESIZE_PRESET_FRAME_CLASSES = {
  square: 'gif-preview-frame--square',
  landscape: 'gif-preview-frame--landscape',
  portrait: 'gif-preview-frame--portrait',
}

const resolveVideoUrl = (mediaValue) => {
  if (!mediaValue) return null
  if (typeof mediaValue === 'string') return mediaValue
  if (typeof mediaValue === 'object') {
    return mediaValue.url || mediaValue.src || mediaValue.source || mediaValue.fullUrl || null
  }
  return null
}

function GifResizePresets({
  initialPreset = DEFAULT_GIF_RESIZE_PRESET,
  initialBorderColor = DEFAULT_GIF_RESIZE_BORDER_COLOR,
  videoFile,
  onApply,
  onCancel,
}) {
  const [selectedPreset, setSelectedPreset] = useState(initialPreset)
  const [selectedBorderColor, setSelectedBorderColor] = useState(initialBorderColor)

  const videoUrl = useMemo(() => {
    if (!videoFile) return null
    if (videoFile instanceof File) {
      try {
        return URL.createObjectURL(videoFile)
      } catch {
        return null
      }
    }
    return resolveVideoUrl(videoFile)
  }, [videoFile])

  const previewFrameClassName =
    GIF_RESIZE_PRESET_FRAME_CLASSES[selectedPreset] || GIF_RESIZE_PRESET_FRAME_CLASSES.square

  useEffect(() => {
    setSelectedPreset(initialPreset)
  }, [initialPreset])

  useEffect(() => {
    setSelectedBorderColor(initialBorderColor)
  }, [initialBorderColor])

  useEffect(() => {
    if (!(videoFile instanceof File) || !videoUrl) return
    return () => {
      if (import.meta.env.PROD) {
        URL.revokeObjectURL(videoUrl)
      }
    }
  }, [videoFile, videoUrl])

  const handleApply = () => {
    onApply?.({
      preset: selectedPreset,
      borderColor: selectedBorderColor,
    })
  }

  const handleReset = () => {
    setSelectedPreset(DEFAULT_GIF_RESIZE_PRESET)
    setSelectedBorderColor(DEFAULT_GIF_RESIZE_BORDER_COLOR)
  }

  return (
    <EditorToolScreen
      title="Resize"
      preview={(
        <div className="card gif-resize-preview-card preview-box-checkered editor-preview--checkered">
          {videoUrl ? (
            <div
              className={`gif-preview-frame ${previewFrameClassName}`}
              style={{ backgroundColor: selectedBorderColor }}
            >
              <video src={videoUrl} controls className="preview-video editor-preview-media gif-preview-video" />
            </div>
          ) : (
            <p className="preview-label" style={{ margin: 0, textAlign: 'center' }}>
              Upload a video to preview resize.
            </p>
          )}
        </div>
      )}
      controls={(
        <div className="card filter-main-buttons">
          {GIF_RESIZE_PRESET_OPTIONS.map((option) => {
            const isActive = selectedPreset === option.key
            return (
              <button
                key={option.key}
                type="button"
                className={isActive ? 'btn-secondary active gif-preset-option is-selected' : 'btn-secondary gif-preset-option'}
                aria-pressed={isActive}
                onClick={() => setSelectedPreset(option.key)}
              >
                {option.label} ({option.subtitle})
              </button>
            )
          })}

          <div className="preset-letterbox" style={{ padding: '0.75rem 0 0 0' }}>
            <p className="preset-letterbox-label">Border color</p>
            <div className="preset-letterbox-custom">
              <span className="preset-letterbox-custom-label">Color</span>
              <input
                type="color"
                className="preset-letterbox-color-input"
                value={selectedBorderColor}
                onChange={(event) => setSelectedBorderColor(event.target.value)}
              />
              <span className="add-text-color-value">{selectedBorderColor.toUpperCase()}</span>
            </div>
          </div>
        </div>
      )}
      actions={(
        <>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn-secondary" onClick={handleReset}>
            Reset
          </button>
          <button type="button" className="btn-primary" onClick={handleApply}>
            Apply
          </button>
        </>
      )}
    />
  )
}

export default GifResizePresets