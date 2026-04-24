import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import FilterScreen from '../FilterScreen'
import EditorStatus from '../EditorStatus'
import { clamp, getContainedContentFrame, getSafeFrame } from '../../utils/overlayPlacement'

/* Slider is a relative scale; backend uses image-space px = round(slider * BACKEND_FONT_SCALE). */
const MIN_UI_FONT_SIZE = 2
const MAX_UI_FONT_SIZE = 56
const DEFAULT_UI_FONT_SIZE = 16
const BACKEND_FONT_SCALE = 5

const DEFAULT_TEXT_COLOR = '#FFFFFF'


function AddText({
  imageSrc,
  onApply,
  onBack,
  onCancel,
  applyError = null,
  initialText,
  initialFont,
  initialTextColor,
  initialFontSize,
  initialPlacement,
}) {
  const [text, setText] = useState(initialText ?? '')
  const [font, setFont] = useState(initialFont ?? 'Arial')
  const [textColor, setTextColor] = useState(initialTextColor ?? DEFAULT_TEXT_COLOR)
  const [fontSize, setFontSize] = useState(initialFontSize ?? DEFAULT_UI_FONT_SIZE)
  const [placement, setPlacement] = useState(initialPlacement ?? { x: 0.5, y: 0.5 })
  const [previewContainerSize, setPreviewContainerSize] = useState({ width: 1, height: 1 })
  const [imageFrame, setImageFrame] = useState({ left: 0, top: 0, width: 1, height: 1 })
  const [naturalImageSize, setNaturalImageSize] = useState({ width: 1, height: 1 })
  const previewContainerRef = useRef(null)
  const previewImageRef = useRef(null)
  const placementDragActiveRef = useRef(false)

  const safeUiFontSize = clamp(Number(fontSize) || DEFAULT_UI_FONT_SIZE, MIN_UI_FONT_SIZE, MAX_UI_FONT_SIZE)
  const backendFontSize = Math.round(safeUiFontSize * BACKEND_FONT_SCALE)
  const previewText = useMemo(() => text || 'Click where you want text', [text])

  useEffect(() => {
    const container = previewContainerRef.current
    const image = previewImageRef.current
    if (!container) return

    const syncFrame = () => {
      const containerRect = container.getBoundingClientRect()
      setPreviewContainerSize({
        width: container.clientWidth || 1,
        height: container.clientHeight || 1,
      })

      if (!image || !image.clientWidth || !image.clientHeight) {
        setNaturalImageSize({ width: 1, height: 1 })
        setImageFrame({ left: 0, top: 0, width: container.clientWidth || 1, height: container.clientHeight || 1 })
        return
      }

      const naturalWidth = Math.max(1, image.naturalWidth || 1)
      const naturalHeight = Math.max(1, image.naturalHeight || 1)
      setNaturalImageSize({ width: naturalWidth, height: naturalHeight })

      const imageRect = image.getBoundingClientRect()
      const containedFrame = getContainedContentFrame({
        frameLeft: imageRect.left - containerRect.left,
        frameTop: imageRect.top - containerRect.top,
        frameWidth: imageRect.width,
        frameHeight: imageRect.height,
        naturalWidth,
        naturalHeight,
      })

      setImageFrame(containedFrame)
    }

    const rafId = requestAnimationFrame(syncFrame)

    const onResize = () => syncFrame()
    window.addEventListener('resize', onResize)

    let observer
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(syncFrame)
      observer.observe(container)
      if (image) observer.observe(image)
    }

    if (image) {
      image.addEventListener('load', syncFrame)
      if (image.complete) syncFrame()
    }

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
      if (image) image.removeEventListener('load', syncFrame)
      observer?.disconnect()
    }
  }, [imageSrc])

  const renderedImageBox = getSafeFrame(imageFrame, previewContainerSize)

  /** Match Sharp/SVG overlay: fontSize is in full-image pixels; scale to preview CSS px. */
  const previewOverlayFontPx = useMemo(() => {
    const nw = Math.max(1, naturalImageSize.width)
    const displayW = Math.max(1, renderedImageBox.width)
    const raw = backendFontSize * (displayW / nw)
    return clamp(raw, 2, 320)
  }, [backendFontSize, naturalImageSize.width, renderedImageBox.width])

  const updatePlacementFromPointer = useCallback((event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const imageBox = getSafeFrame(imageFrame, previewContainerSize)

    const x = clamp((event.clientX - rect.left - imageBox.left) / imageBox.width, 0, 1)
    const y = clamp((event.clientY - rect.top - imageBox.top) / imageBox.height, 0, 1)

    setPlacement({ x, y })
  }, [imageFrame, previewContainerSize])

  const handlePreviewPointerDown = useCallback(
    (event) => {
      if (event.button !== 0) return
      /* Default <img> drag steals pointer moves; keep placement drag on the preview. */
      event.preventDefault()
      placementDragActiveRef.current = true
      updatePlacementFromPointer(event)
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        /* ignore */
      }
    },
    [updatePlacementFromPointer],
  )

  const handlePreviewPointerMove = useCallback(
    (event) => {
      if (!placementDragActiveRef.current && event.buttons !== 1) return
      updatePlacementFromPointer(event)
    },
    [updatePlacementFromPointer],
  )

  const releasePreviewCapture = useCallback((event) => {
    placementDragActiveRef.current = false
    const el = event.currentTarget
    if (typeof el.hasPointerCapture === 'function' && el.hasPointerCapture(event.pointerId)) {
      el.releasePointerCapture(event.pointerId)
    }
  }, [])

  const handlePreviewLostPointerCapture = useCallback(() => {
    placementDragActiveRef.current = false
  }, [])

  const handleApply = () => {
    onApply?.({
      text,
      font,
      fontFamily: font,
      fontSize: backendFontSize,
      color: textColor,
      x: placement.x,
      y: placement.y,
    })
  }

  return (
    <FilterScreen
      title="Add Text"
      imageSrc={imageSrc}
      onApply={handleApply}
      onCancel={onCancel}
      actions={(
        <>
          <button type="button" className="btn-secondary" onClick={onBack}>
            Back
          </button>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleApply}>
            Apply
          </button>
        </>
      )}
      previewInteractive
      onPreviewPointerDown={handlePreviewPointerDown}
      onPreviewPointerMove={handlePreviewPointerMove}
      onPreviewPointerUp={releasePreviewCapture}
      onPreviewPointerCancel={releasePreviewCapture}
      onPreviewLostPointerCapture={handlePreviewLostPointerCapture}
      previewContainerRef={previewContainerRef}
      previewImageRef={previewImageRef}
      previewOverlay={(
        <div
          className="add-text-overlay-image-frame"
          style={{
            left: `${(renderedImageBox.left / previewContainerSize.width) * 100}%`,
            top: `${(renderedImageBox.top / previewContainerSize.height) * 100}%`,
            width: `${(renderedImageBox.width / previewContainerSize.width) * 100}%`,
            height: `${(renderedImageBox.height / previewContainerSize.height) * 100}%`,
          }}
        >
          <div
            className="add-text-placement-marker"
            style={{
              left: `${placement.x * 100}%`,
              top: `${placement.y * 100}%`,
            }}
          >
            <div
              className="add-text-placement-marker-box"
              style={{
                fontFamily: font,
                fontSize: `${previewOverlayFontPx}px`,
                color: textColor,
              }}
            >
              {previewText}
            </div>
          </div>
        </div>
      )}
    >
      <div className="add-text-form">
        {applyError ? (
          <EditorStatus tone="error">
            {applyError}
          </EditorStatus>
        ) : null}

        <div className="add-text-field add-text-field--grid">
          <span className="add-text-label">Move</span>
          <EditorStatus>Click or drag the preview.</EditorStatus>
        </div>

        <div className="add-text-field add-text-field--stack">
          <label htmlFor="add-text-input" className="add-text-label">
            Text
          </label>
          <textarea
            id="add-text-input"
            rows={3}
            placeholder="Enter text here (multi-line supported)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="text-input add-text-input"
          />
        </div>

        <div className="add-text-field add-text-field--grid">
          <span className="add-text-label">Font</span>
          <select
            value={font}
            onChange={(e) => setFont(e.target.value)}
            className="form-select add-text-select"
          >
            <option value="Arial">Arial</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Georgia">Georgia</option>
          </select>
        </div>

        <div className="add-text-field add-text-field--grid">
          <span className="add-text-label">Color</span>
          <div className="add-text-color-controls">
            <input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="add-text-color-input"
              aria-label="Text color"
            />
            <span className="add-text-color-value">{textColor.toUpperCase()}</span>
          </div>
        </div>

        <div className="add-text-field add-text-field--grid">
          <span className="add-text-label">Size</span>
          <div className="add-text-size-controls">
            <input
              type="number"
              min={MIN_UI_FONT_SIZE}
              max={MAX_UI_FONT_SIZE}
              step={1}
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value)}
              className="text-input editor-number-input add-text-size-input"
            />
            <input
              type="range"
              min={MIN_UI_FONT_SIZE}
              max={MAX_UI_FONT_SIZE}
              step={1}
              value={safeUiFontSize}
              onChange={(e) => setFontSize(e.target.value)}
              className="add-text-size-slider editor-slider"
            />
          </div>
        </div>

      </div>
    </FilterScreen>
  )
}

export default AddText
