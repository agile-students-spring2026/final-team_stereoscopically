import { useEffect, useMemo, useRef, useState } from 'react'
import FilterScreen from './FilterScreen'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const MIN_UI_FONT_SIZE = 8
const MAX_UI_FONT_SIZE = 120
const DEFAULT_UI_FONT_SIZE = 32
const BACKEND_FONT_SCALE = 30

const DEFAULT_TEXT_COLOR = '#111111'

const getRenderedImageBox = ({ containerWidth, containerHeight, imageWidth, imageHeight }) => {
  const safeContainerW = Math.max(1, containerWidth || 1)
  const safeContainerH = Math.max(1, containerHeight || 1)
  const safeImageW = Math.max(1, imageWidth || 1)
  const safeImageH = Math.max(1, imageHeight || 1)

  const scale = Math.min(safeContainerW / safeImageW, safeContainerH / safeImageH)
  const width = safeImageW * scale
  const height = safeImageH * scale
  const left = (safeContainerW - width) / 2
  const top = (safeContainerH - height) / 2

  return { left, top, width, height }
}

function AddText({ imageSrc, onApply, onCancel, applyError = null }) {
  const [text, setText] = useState('')
  const [font, setFont] = useState('Arial')
  const [fontSize, setFontSize] = useState(DEFAULT_UI_FONT_SIZE)
  const [placement, setPlacement] = useState({ x: 0.5, y: 0.5 })
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 1, height: 1 })
  const [previewContainerSize, setPreviewContainerSize] = useState({ width: 1, height: 1 })
  const previewContainerRef = useRef(null)

  const safeUiFontSize = clamp(Number(fontSize) || DEFAULT_UI_FONT_SIZE, MIN_UI_FONT_SIZE, MAX_UI_FONT_SIZE)
  const backendFontSize = Math.round(safeUiFontSize * BACKEND_FONT_SCALE)
  const previewFontSize = clamp(safeUiFontSize, 12, 84)
  const previewText = useMemo(() => text || 'Click where you want text', [text])

  useEffect(() => {
    if (!imageSrc) return

    const image = new Image()
    image.onload = () => {
      setImageNaturalSize({
        width: image.naturalWidth || 1,
        height: image.naturalHeight || 1,
      })
    }
    image.src = imageSrc
  }, [imageSrc])

  useEffect(() => {
    const element = previewContainerRef.current
    if (!element) return

    const syncSize = () => {
      setPreviewContainerSize({
        width: element.clientWidth || 1,
        height: element.clientHeight || 1,
      })
    }

    syncSize()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', syncSize)
      return () => window.removeEventListener('resize', syncSize)
    }

    const observer = new ResizeObserver(syncSize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const renderedImageBox = getRenderedImageBox({
    containerWidth: previewContainerSize.width,
    containerHeight: previewContainerSize.height,
    imageWidth: imageNaturalSize.width,
    imageHeight: imageNaturalSize.height,
  })

  const updatePlacementFromPointer = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const imageBox = getRenderedImageBox({
      containerWidth: rect.width,
      containerHeight: rect.height,
      imageWidth: imageNaturalSize.width,
      imageHeight: imageNaturalSize.height,
    })

    const x = clamp((event.clientX - rect.left - imageBox.left) / imageBox.width, 0, 1)
    const y = clamp((event.clientY - rect.top - imageBox.top) / imageBox.height, 0, 1)

    setPlacement({ x, y })
  }

  const handleApply = () => {
    onApply?.({
      text,
      font,
      fontFamily: font,
      fontSize: backendFontSize,
      color: DEFAULT_TEXT_COLOR,
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
      previewInteractive
      onPreviewPointerDown={updatePlacementFromPointer}
      onPreviewPointerMove={(event) => {
        if (event.buttons !== 1) return
        updatePlacementFromPointer(event)
      }}
      previewContainerRef={previewContainerRef}
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
              fontFamily: font,
              fontSize: `${previewFontSize}px`,
              color: DEFAULT_TEXT_COLOR,
            }}
          >
            {previewText}
          </div>
        </div>
      )}
    >
      <div className="add-text-form">
        {applyError ? (
          <p role="alert" className="upload-status" style={{ marginTop: 0, color: '#ff3b30' }}>
            {applyError}
          </p>
        ) : null}

        <p className="add-text-placement-hint add-text-placement-hint--top">
          Placement
          <br />
          Click or drag on the preview above to place your text.
        </p>

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
          <span className="add-text-label">Size</span>
          <div className="add-text-size-controls">
            <input
              type="number"
              min={MIN_UI_FONT_SIZE}
              max={MAX_UI_FONT_SIZE}
              step={1}
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value)}
              className="text-input add-text-size-input"
            />
            <input
              type="range"
              min={MIN_UI_FONT_SIZE}
              max={MAX_UI_FONT_SIZE}
              step={1}
              value={safeUiFontSize}
              onChange={(e) => setFontSize(e.target.value)}
              className="add-text-size-slider"
            />
            <p className="add-text-size-help">
              Size: {safeUiFontSize}px (range {MIN_UI_FONT_SIZE}–{MAX_UI_FONT_SIZE})
            </p>
          </div>
        </div>

      </div>
    </FilterScreen>
  )
}

export default AddText
