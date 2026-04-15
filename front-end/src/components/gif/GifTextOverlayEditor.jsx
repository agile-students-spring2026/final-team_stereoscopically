import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const DEFAULT_TEXT_OVERLAY_SETTINGS = {
  text: '',
  size: 32,
  color: '#FFFFFF',
  position: { x: 50, y: 50 },
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const getContainedContentFrame = ({
  frameLeft,
  frameTop,
  frameWidth,
  frameHeight,
  naturalWidth,
  naturalHeight,
}) => {
  const safeFrameWidth = Math.max(1, frameWidth || 1)
  const safeFrameHeight = Math.max(1, frameHeight || 1)
  const safeNaturalWidth = Math.max(1, naturalWidth || 1)
  const safeNaturalHeight = Math.max(1, naturalHeight || 1)

  const scale = Math.min(safeFrameWidth / safeNaturalWidth, safeFrameHeight / safeNaturalHeight)
  const width = safeNaturalWidth * scale
  const height = safeNaturalHeight * scale

  return {
    left: frameLeft + (safeFrameWidth - width) / 2,
    top: frameTop + (safeFrameHeight - height) / 2,
    width,
    height,
  }
}

const getSafeFrame = (frame, containerSize) => {
  const fallbackWidth = Math.max(1, containerSize.width || 1)
  const fallbackHeight = Math.max(1, containerSize.height || 1)

  return {
    left: Number.isFinite(frame?.left) ? frame.left : 0,
    top: Number.isFinite(frame?.top) ? frame.top : 0,
    width: Number.isFinite(frame?.width) && frame.width > 0 ? frame.width : fallbackWidth,
    height: Number.isFinite(frame?.height) && frame.height > 0 ? frame.height : fallbackHeight,
  }
}

const asNumberOrFallback = (value, fallback) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

const resolveVideoUrl = (mediaValue) => {
  if (!mediaValue) return null
  if (typeof mediaValue === 'string') return mediaValue
  if (typeof mediaValue === 'object') {
    return mediaValue.url || mediaValue.src || mediaValue.source || mediaValue.fullUrl || null
  }
  return null
}

function GifTextOverlayEditor({ videoFile, initialSettings, onBack, onCancel, onApply, onChange }) {
  const safeInitial = useMemo(() => ({
    ...DEFAULT_TEXT_OVERLAY_SETTINGS,
    ...initialSettings,
    position: {
      ...DEFAULT_TEXT_OVERLAY_SETTINGS.position,
      ...(initialSettings?.position || {}),
    },
  }), [initialSettings])

  const [draft, setDraft] = useState(safeInitial)
  const [previewContainerSize, setPreviewContainerSize] = useState({ width: 1, height: 1 })
  const [videoFrame, setVideoFrame] = useState({ left: 0, top: 0, width: 1, height: 1 })
  const [naturalVideoSize, setNaturalVideoSize] = useState({ width: 1, height: 1 })

  const previewContainerRef = useRef(null)
  const previewVideoRef = useRef(null)
  const placementDragActiveRef = useRef(false)

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

  useEffect(() => {
    setDraft(safeInitial)
  }, [safeInitial])

  useEffect(() => {
    if (!(videoFile instanceof File) || !videoUrl) return

    return () => {
      if (import.meta.env.PROD) {
        URL.revokeObjectURL(videoUrl)
      }
    }
  }, [videoFile, videoUrl])

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
        setVideoFrame({ left: 0, top: 0, width: container.clientWidth || 1, height: container.clientHeight || 1 })
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

      onChange?.(next)
      return next
    })
  }, [onChange])

  const safePositionX = clamp(asNumberOrFallback(draft.position?.x, 50), 0, 100)
  const safePositionY = clamp(asNumberOrFallback(draft.position?.y, 50), 0, 100)
  const safeTextSize = clamp(asNumberOrFallback(draft.size, DEFAULT_TEXT_OVERLAY_SETTINGS.size), 8, 120)
  const renderedVideoBox = getSafeFrame(videoFrame, previewContainerSize)

  const previewOverlayFontPx = useMemo(() => {
    const naturalWidth = Math.max(1, naturalVideoSize.width)
    const displayWidth = Math.max(1, renderedVideoBox.width)
    return clamp(safeTextSize * (displayWidth / naturalWidth), 8, 240)
  }, [naturalVideoSize.width, renderedVideoBox.width, safeTextSize])

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
    <div className="preset-sizes-screen">
      <div className="screen-header screen-header-column">
        <h2 className="screen-title">Text</h2>
      </div>

      <div
        ref={previewContainerRef}
        className="preview-box editor-preview preview-box-video editor-preview--video preview-box-checkered editor-preview--checkered preview-box-interactive editor-preview--interactive"
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
            className="preview-video editor-preview-media"
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <span className="preview-label">Upload a video to preview text placement.</span>
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

      <div className="card" style={{ display: 'grid', gap: '0.75rem' }}>
        <p className="add-text-placement-hint add-text-placement-hint--top">
          Click or drag the preview to place your text.
        </p>

        <label htmlFor="gif-text-content" className="add-text-label">Text content</label>
        <textarea
          id="gif-text-content"
          rows={3}
          className="text-input add-text-input"
          placeholder="Type GIF text"
          value={draft.text}
          onChange={(event) => updateDraft({ text: event.target.value })}
        />

        <label htmlFor="gif-text-size" className="add-text-label">Size</label>
        <input
          id="gif-text-size"
          type="number"
          min={8}
          max={120}
          className="text-input editor-number-input add-text-size-input"
          value={draft.size}
          onChange={(event) => updateDraft({ size: asNumberOrFallback(event.target.value, draft.size) })}
        />

        <label htmlFor="gif-text-color" className="add-text-label">Color</label>
        <div className="add-text-color-controls">
          <input
            id="gif-text-color"
            type="color"
            className="add-text-color-input"
            value={draft.color}
            onChange={(event) => updateDraft({ color: event.target.value })}
          />
          <span className="add-text-color-value">{String(draft.color || '').toUpperCase()}</span>
        </div>
      </div>

      <div className="card-actions editor-actions editor-actions--inline preset-sizes-screen-actions">
        <button type="button" className="btn-secondary" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn-primary" onClick={() => onApply?.(draft)}>
          Apply
        </button>
      </div>
    </div>
  )
}

export default GifTextOverlayEditor
