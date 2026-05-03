import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import EditorStatus from '../EditorStatus'
import {
  asNumberOrFallback,
  clamp,
  getContainedContentFrame,
  getSafeFrame,
} from '../../utils/overlayPlacement'
import useVideoPreviewUrl from '../../hooks/useVideoPreviewUrl'
import EditorToolScreen from '../EditorToolScreen'
import { DEFAULT_GIF_RESIZE_PRESET, GIF_TEXT_FONT_FAMILIES } from './gifEditorConstants'
import { gifTextPreviewOverlayFontCssPx } from '../../utils/gifTextOverlayPreviewSizing'

const DEFAULT_TEXT_OVERLAY_SETTINGS = {
  text: '',
  fontFamily: 'Arial',
  size: 32,
  color: '#FFFFFF',
  position: { x: 50, y: 50 },
}

const MIN_UI_TEXT_SIZE = 8
const MAX_UI_TEXT_SIZE = 120

function buildTextOverlayDraft(initialSettings) {
  return {
    ...DEFAULT_TEXT_OVERLAY_SETTINGS,
    ...initialSettings,
    position: {
      ...DEFAULT_TEXT_OVERLAY_SETTINGS.position,
      ...(initialSettings?.position || {}),
    },
  }
}

function GifTextOverlayEditor({
  videoFile,
  initialSettings,
  resizePreset = DEFAULT_GIF_RESIZE_PRESET,
  onBack,
  onCancel,
  onApply,
  /** Persist current draft to session before navigating away (Save for later uses session, not local draft). */
  onCommitDraft,
  /** Keep parent session in sync while editing so Save for later always persists text. */
  onDraftSessionSync,
}) {
  const [draft, setDraft] = useState(() => buildTextOverlayDraft(initialSettings))

  const [previewContainerSize, setPreviewContainerSize] = useState({ width: 1, height: 1 })
  const [videoFrame, setVideoFrame] = useState({ left: 0, top: 0, width: 1, height: 1 })
  const [naturalVideoSize, setNaturalVideoSize] = useState({ width: 1, height: 1 })

  const previewContainerRef = useRef(null)
  const previewVideoRef = useRef(null)
  const placementDragActiveRef = useRef(false)

  const videoUrl = useVideoPreviewUrl(videoFile)

  useEffect(() => {
    const container = previewContainerRef.current
    const video = previewVideoRef.current
    if (!container) return

    const syncFrame = () => {
      const containerRect = container.getBoundingClientRect()

      setPreviewContainerSize({
        width: container.clientWidth || 1,
        height: container.clientHeight || 1,
      })

      if (!video || !video.clientWidth || !video.clientHeight) {
        setNaturalVideoSize({ width: 1, height: 1 })
        setVideoFrame({
          left: 0,
          top: 0,
          width: container.clientWidth || 1,
          height: container.clientHeight || 1,
        })
        return
      }

      const naturalWidth = Math.max(1, video.videoWidth || 1)
      const naturalHeight = Math.max(1, video.videoHeight || 1)

      setNaturalVideoSize({ width: naturalWidth, height: naturalHeight })

      const videoRect = video.getBoundingClientRect()
      const containedFrame = getContainedContentFrame({
        frameLeft: videoRect.left - containerRect.left,
        frameTop: videoRect.top - containerRect.top,
        frameWidth: videoRect.width,
        frameHeight: videoRect.height,
        naturalWidth,
        naturalHeight,
      })

      setVideoFrame(containedFrame)
    }

    const rafId = requestAnimationFrame(syncFrame)

    const onResize = () => syncFrame()
    window.addEventListener('resize', onResize)

    let observer
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(syncFrame)
      observer.observe(container)
      if (video) observer.observe(video)
    }

    if (video) {
      video.addEventListener('loadedmetadata', syncFrame)
      if (video.readyState >= 1) syncFrame()
    }

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
      if (video) video.removeEventListener('loadedmetadata', syncFrame)
      observer?.disconnect()
    }
  }, [videoUrl])

  const updateDraft = useCallback((partial) => {
    setDraft((current) => {
      const next = {
        ...current,
        ...partial,
        position: {
          ...current.position,
          ...(partial?.position || {}),
        },
      }
      onDraftSessionSync?.(next)
      return next
    })
  }, [onDraftSessionSync])

  const safePositionX = clamp(asNumberOrFallback(draft.position?.x, 50), 0, 100)
  const safePositionY = clamp(asNumberOrFallback(draft.position?.y, 50), 0, 100)
  const safeTextSize = clamp(
    asNumberOrFallback(draft.size, DEFAULT_TEXT_OVERLAY_SETTINGS.size),
    MIN_UI_TEXT_SIZE,
    MAX_UI_TEXT_SIZE,
  )
  const renderedVideoBox = getSafeFrame(videoFrame, previewContainerSize)

  const previewOverlayFontPx = useMemo(
    () =>
      gifTextPreviewOverlayFontCssPx({
        sourceWidth: naturalVideoSize.width,
        sourceHeight: naturalVideoSize.height,
        resizePreset,
        uiTextSize: safeTextSize,
        contentRectWidthPx: renderedVideoBox.width,
      }),
    [
      naturalVideoSize.width,
      naturalVideoSize.height,
      renderedVideoBox.width,
      resizePreset,
      safeTextSize,
    ],
  )

  const updatePlacementFromPointer = useCallback((event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const safeFrame = getSafeFrame(videoFrame, previewContainerSize)

    const x = clamp(((event.clientX - rect.left - safeFrame.left) / safeFrame.width) * 100, 0, 100)
    const y = clamp(((event.clientY - rect.top - safeFrame.top) / safeFrame.height) * 100, 0, 100)

    updateDraft({ position: { x, y } })
  }, [previewContainerSize, updateDraft, videoFrame])

  const handlePreviewPointerDown = useCallback((event) => {
    if (event.button !== 0) return

    event.preventDefault()
    placementDragActiveRef.current = true
    updatePlacementFromPointer(event)

    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Ignore unsupported pointer capture environments.
    }
  }, [updatePlacementFromPointer])

  const handlePreviewPointerMove = useCallback((event) => {
    if (!placementDragActiveRef.current && event.buttons !== 1) return
    updatePlacementFromPointer(event)
  }, [updatePlacementFromPointer])

  const releasePreviewCapture = useCallback((event) => {
    placementDragActiveRef.current = false

    const element = event.currentTarget
    if (typeof element.hasPointerCapture === 'function' && element.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId)
    }
  }, [])

  const handlePreviewLostPointerCapture = useCallback(() => {
    placementDragActiveRef.current = false
  }, [])

  const hasTextContent = Boolean(draft.text?.trim())

  return (
    <EditorToolScreen
      title="Add Text"
      preview={(
        <div
          ref={previewContainerRef}
          className="editor-preview editor-preview--video editor-preview--checkered editor-preview--interactive"
          onPointerDown={handlePreviewPointerDown}
          onPointerMove={handlePreviewPointerMove}
          onPointerUp={releasePreviewCapture}
          onPointerCancel={releasePreviewCapture}
          onLostPointerCapture={handlePreviewLostPointerCapture}
        >
          {videoUrl ? (
            <video
              ref={previewVideoRef}
              src={videoUrl}
              className="editor-preview-media"
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <EditorStatus centered>Upload a video to preview text placement.</EditorStatus>
          )}

          <div className="filter-screen-preview-overlay" aria-hidden="true">
            <div
              className="add-text-overlay-image-frame"
              style={{
                left: `${(renderedVideoBox.left / previewContainerSize.width) * 100}%`,
                top: `${(renderedVideoBox.top / previewContainerSize.height) * 100}%`,
                width: `${(renderedVideoBox.width / previewContainerSize.width) * 100}%`,
                height: `${(renderedVideoBox.height / previewContainerSize.height) * 100}%`,
              }}
            >
              <div
                className="add-text-placement-marker"
                style={{
                  left: `${safePositionX}%`,
                  top: `${safePositionY}%`,
                }}
              >
                <div
                  className="add-text-placement-marker-box"
                  style={{
                    color: draft.color,
                    fontFamily: draft.fontFamily || 'Arial',
                    fontSize: `${previewOverlayFontPx}px`,
                    fontWeight: 600,
                    whiteSpace: 'pre-wrap',
                    opacity: hasTextContent ? 1 : 0.75,
                  }}
                >
                  {hasTextContent ? draft.text : 'Drag text position'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      controls={(
        <div className="card filter-main-buttons">
          <div className="add-text-form">
            <div className="add-text-field add-text-field--grid">
              <span className="add-text-label">Move</span>
              <EditorStatus>Click or drag the preview.</EditorStatus>
            </div>

            <div className="add-text-field add-text-field--stack">
              <label htmlFor="gif-text-content" className="add-text-label">Text</label>
              <textarea
                id="gif-text-content"
                rows={3}
                className="text-input add-text-input"
                placeholder="Type GIF text"
                value={draft.text}
                onChange={(event) => updateDraft({ text: event.target.value })}
              />
            </div>

            <div className="add-text-field add-text-field--grid">
              <span className="add-text-label">Font</span>
              <select
                id="gif-text-font-family"
                value={draft.fontFamily || 'Arial'}
                onChange={(event) => updateDraft({ fontFamily: event.target.value })}
                className="form-select add-text-select"
              >
                {GIF_TEXT_FONT_FAMILIES.map((family) => (
                  <option key={family} value={family}>
                    {family}
                  </option>
                ))}
              </select>
            </div>

            <div className="add-text-field add-text-field--grid">
              <span className="add-text-label">Color</span>
              <div className="add-text-color-controls">
                <input
                  id="gif-text-color"
                  type="color"
                  className="add-text-color-input"
                  value={draft.color}
                  onChange={(event) => updateDraft({ color: event.target.value })}
                />
                <span className="add-text-color-value">
                  {String(draft.color || '').toUpperCase()}
                </span>
              </div>
            </div>

            <div className="add-text-field add-text-field--grid">
              <span className="add-text-label">Size</span>
              <div className="add-text-size-controls">
                <input
                  id="gif-text-size"
                  type="number"
                  min={MIN_UI_TEXT_SIZE}
                  max={MAX_UI_TEXT_SIZE}
                  className="text-input editor-number-input add-text-size-input"
                  value={safeTextSize}
                  onChange={(event) => updateDraft({
                    size: asNumberOrFallback(event.target.value, safeTextSize),
                  })}
                />
                <input
                  type="range"
                  min={MIN_UI_TEXT_SIZE}
                  max={MAX_UI_TEXT_SIZE}
                  step={1}
                  value={safeTextSize}
                  onChange={(event) => updateDraft({
                    size: asNumberOrFallback(event.target.value, safeTextSize),
                  })}
                  className="add-text-size-slider editor-slider"
                />
              </div>
            </div>
          </div>
        </div>
      )}
      actions={(
        <>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              onCommitDraft?.(draft)
              onBack?.()
            }}
          >
            Filter menu
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              onCommitDraft?.(draft)
              onCancel?.()
            }}
          >
            Back to editor
          </button>
          <button type="button" className="btn-primary" onClick={() => onApply?.(draft)}>
            Apply
          </button>
        </>
      )}
    />
  )
}

export default GifTextOverlayEditor