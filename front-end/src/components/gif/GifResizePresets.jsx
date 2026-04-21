import { useEffect, useState } from 'react'
import EditorToolScreen from '../EditorToolScreen'
import EditorStatus from '../EditorStatus'
import useVideoPreviewUrl from '../../hooks/useVideoPreviewUrl'
import {
  DEFAULT_GIF_RESIZE_BORDER_COLOR,
  DEFAULT_GIF_RESIZE_PRESET,
  GIF_RESIZE_BORDER_SWATCHES,
  GIF_RESIZE_PRESET_FRAME_CLASSES,
  GIF_RESIZE_PRESET_OPTIONS,
} from './gifEditorConstants'

function GifResizePresets({
  initialPreset = DEFAULT_GIF_RESIZE_PRESET,
  initialBorderColor = DEFAULT_GIF_RESIZE_BORDER_COLOR,
  videoFile,
  onApply,
  onCancel,
}) {
  const [selectedPreset, setSelectedPreset] = useState(initialPreset)
  const [selectedBorderColor, setSelectedBorderColor] = useState(initialBorderColor)

  const videoUrl = useVideoPreviewUrl(videoFile)

  const previewFrameClassName =
    GIF_RESIZE_PRESET_FRAME_CLASSES[selectedPreset] || GIF_RESIZE_PRESET_FRAME_CLASSES.square

  useEffect(() => {
    queueMicrotask(() => {
      setSelectedPreset(initialPreset)
    })
  }, [initialPreset])

  useEffect(() => {
    queueMicrotask(() => {
      setSelectedBorderColor(initialBorderColor)
    })
  }, [initialBorderColor])

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
      subtitle="Choose a size and border color, then apply."
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
            <EditorStatus centered>Upload a video to preview resize.</EditorStatus>
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

          <div className="preset-letterbox resize-border-controls">
            <p className="preset-letterbox-label">Border color</p>
            <div className="preset-letterbox-row">
              {GIF_RESIZE_BORDER_SWATCHES.map((swatch) => {
                const isActive = selectedBorderColor === swatch.value

                return (
                  <button
                    key={swatch.id}
                    type="button"
                    className={isActive ? 'btn-secondary active gif-preset-option is-selected' : 'btn-secondary gif-preset-option'}
                    aria-pressed={isActive}
                    onClick={() => setSelectedBorderColor(swatch.value)}
                  >
                    {swatch.label}
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
                aria-label="Custom border color"
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