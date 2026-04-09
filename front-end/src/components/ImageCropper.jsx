import { useCallback, useEffect, useRef, useState } from 'react'

const MIN_CROP_SIZE = 20

const clamp = (value, min, max) => Math.max(min, Math.min(value, max))

const clampCropToContainer = (crop, container) => {
  const maxWidth = Math.max(MIN_CROP_SIZE, container.width)
  const maxHeight = Math.max(MIN_CROP_SIZE, container.height)

  const width = clamp(crop.width, MIN_CROP_SIZE, maxWidth)
  const height = clamp(crop.height, MIN_CROP_SIZE, maxHeight)
  const x = clamp(crop.x, 0, Math.max(0, container.width - width))
  const y = clamp(crop.y, 0, Math.max(0, container.height - height))

  return { x, y, width, height }
}

function ImageCropper({ imageSrc, onCropChange }) {
  // Tracks crop box position and size
  const [cropData, setCropData] = useState({
    x: 50,
    y: 50,
    width: 200,
    height: 200,
  })
  // Reference to container element for measuring size
  const containerRef = useRef(null)
  const interactionRef = useRef(null)
  const activePointerIdRef = useRef(null)
  // Stores container width and height for boundary calculations
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  const syncCropToContainer = useCallback((nextContainer) => {
    if (!nextContainer.width || !nextContainer.height) return

    setCropData((prev) => {
      const next = clampCropToContainer(prev, nextContainer)
      if (
        next.x === prev.x &&
        next.y === prev.y &&
        next.width === prev.width &&
        next.height === prev.height
      ) {
        return prev
      }

      onCropChange?.(next)
      return next
    })
  }, [onCropChange])

  const measureContainer = useCallback(() => {
    if (!containerRef.current) return
    const next = {
      width: containerRef.current.offsetWidth,
      height: containerRef.current.offsetHeight,
    }

    setContainerSize(next)
    syncCropToContainer(next)
  }, [syncCropToContainer])

  // Measure container size when image loads or viewport changes
  useEffect(() => {
    measureContainer()

    window.addEventListener('resize', measureContainer)
    return () => window.removeEventListener('resize', measureContainer)
    // imageSrc change can alter rendered dimensions
  }, [imageSrc, measureContainer])

  const applyPointerUpdate = useCallback((clientX, clientY) => {
    const interaction = interactionRef.current
    if (!interaction) return

    const { mode, handle, startPointer, startCrop } = interaction
    const dx = clientX - startPointer.x
    const dy = clientY - startPointer.y
    let nextCrop = { ...startCrop }

    if (mode === 'drag') {
      nextCrop.x = startCrop.x + dx
      nextCrop.y = startCrop.y + dy
    }

    if (mode === 'resize') {
      if (handle.includes('e')) {
        nextCrop.width = startCrop.width + dx
      }

      if (handle.includes('s')) {
        nextCrop.height = startCrop.height + dy
      }

      if (handle.includes('w')) {
        const maxWidth = startCrop.x + startCrop.width
        nextCrop.x = startCrop.x + dx
        nextCrop.width = maxWidth - nextCrop.x
      }

      if (handle.includes('n')) {
        const maxHeight = startCrop.y + startCrop.height
        nextCrop.y = startCrop.y + dy
        nextCrop.height = maxHeight - nextCrop.y
      }
    }

    nextCrop = clampCropToContainer(nextCrop, containerSize)

    setCropData((prev) => {
      if (
        nextCrop.x === prev.x &&
        nextCrop.y === prev.y &&
        nextCrop.width === prev.width &&
        nextCrop.height === prev.height
      ) {
        return prev
      }

      onCropChange?.(nextCrop)
      return nextCrop
    })
  }, [containerSize, onCropChange])

  const startInteraction = (mode, event, handle = null) => {
    if (!containerSize.width || !containerSize.height) return

    activePointerIdRef.current = event.pointerId
    interactionRef.current = {
      mode,
      handle,
      startPointer: { x: event.clientX, y: event.clientY },
      startCrop: { ...cropData },
    }

    if (event.currentTarget?.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId)
    }

    applyPointerUpdate(event.clientX, event.clientY)
  }

  const stopInteraction = () => {
    interactionRef.current = null
    activePointerIdRef.current = null
  }

  useEffect(() => () => stopInteraction(), [])

  const handleBoxPointerDown = (event) => {
    event.preventDefault()
    startInteraction('drag', event)
  }

  const handleResizePointerDown = (handle, event) => {
    event.preventDefault()
    event.stopPropagation()
    startInteraction('resize', event, handle)
  }

  const handleContainerPointerMove = (event) => {
    if (!interactionRef.current) return
    if (activePointerIdRef.current !== null && event.pointerId !== activePointerIdRef.current) return
    applyPointerUpdate(event.clientX, event.clientY)
  }

  const handleContainerPointerEnd = (event) => {
    if (activePointerIdRef.current !== null && event.pointerId !== activePointerIdRef.current) return
    stopInteraction()
  }

  return (
    <div className="image-cropper">
      {/* Container for image and crop overlay */}
      <div
        className="cropper-container"
        ref={containerRef}
        onPointerMove={handleContainerPointerMove}
        onPointerUp={handleContainerPointerEnd}
        onPointerCancel={handleContainerPointerEnd}
        onPointerLeave={handleContainerPointerEnd}
      >
  <img src={imageSrc} alt="Cropping preview" className="cropper-image" onLoad={measureContainer} />
        {/* Overlay layer containing the crop box and handles */}
        <div className="crop-overlay">
          {/* Draggable crop box with corner resize handles */}
          <div
            className="crop-box"
            style={{
              left: `${cropData.x}px`,
              top: `${cropData.y}px`,
              width: `${cropData.width}px`,
              height: `${cropData.height}px`,
            }}
            onPointerDown={handleBoxPointerDown}
          >
            {/* Corner handles for resizing */}
            <div
              className="crop-handle"
              data-handle="nw"
              style={{ top: 0, left: 0 }}
              onPointerDown={(event) => handleResizePointerDown('nw', event)}
            />
            <div
              className="crop-handle"
              data-handle="ne"
              style={{ top: 0, right: 0 }}
              onPointerDown={(event) => handleResizePointerDown('ne', event)}
            />
            <div
              className="crop-handle"
              data-handle="sw"
              style={{ bottom: 0, left: 0 }}
              onPointerDown={(event) => handleResizePointerDown('sw', event)}
            />
            <div
              className="crop-handle"
              data-handle="se"
              style={{ bottom: 0, right: 0 }}
              onPointerDown={(event) => handleResizePointerDown('se', event)}
            />
          </div>
        </div>
      </div>
      {/* Display current crop dimensions */}
      <div className="cropper-info">
        <p>
          Crop: X={Math.round(cropData.x)} Y={Math.round(cropData.y)} W=
          {Math.round(cropData.width)} H={Math.round(cropData.height)}
        </p>
      </div>
    </div>
  )
}

export default ImageCropper
