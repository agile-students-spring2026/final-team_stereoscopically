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
  const latestPointerRef = useRef(null)
  const rafIdRef = useRef(null)
  const cropDataRef = useRef(cropData)
  const containerSizeRef = useRef({ width: 0, height: 0 })
  const onCropChangeRef = useRef(onCropChange)
  // Stores container width and height for boundary calculations
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    cropDataRef.current = cropData
  }, [cropData])

  useEffect(() => {
    containerSizeRef.current = containerSize
  }, [containerSize])

  useEffect(() => {
    onCropChangeRef.current = onCropChange
  }, [onCropChange])

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

      onCropChangeRef.current?.(next)
      return next
    })
  }, [])

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

    nextCrop = clampCropToContainer(nextCrop, containerSizeRef.current)

    setCropData((prev) => {
      if (
        nextCrop.x === prev.x &&
        nextCrop.y === prev.y &&
        nextCrop.width === prev.width &&
        nextCrop.height === prev.height
      ) {
        return prev
      }

      onCropChangeRef.current?.(nextCrop)
      return nextCrop
    })
  }, [])

  const flushPointerUpdate = useCallback(() => {
    rafIdRef.current = null
    if (!latestPointerRef.current) return

    applyPointerUpdate(latestPointerRef.current.x, latestPointerRef.current.y)
  }, [applyPointerUpdate])

  const queuePointerUpdate = useCallback((clientX, clientY) => {
    latestPointerRef.current = { x: clientX, y: clientY }
    if (rafIdRef.current !== null) return

    rafIdRef.current = window.requestAnimationFrame(flushPointerUpdate)
  }, [flushPointerUpdate])

  const startInteraction = (mode, event, handle = null) => {
    if (!containerSizeRef.current.width || !containerSizeRef.current.height) return

    interactionRef.current = {
      mode,
      handle,
      startPointer: { x: event.clientX, y: event.clientY },
      startCrop: { ...cropDataRef.current },
    }

    queuePointerUpdate(event.clientX, event.clientY)
  }

  const stopInteraction = () => {
    interactionRef.current = null
    latestPointerRef.current = null

    if (rafIdRef.current !== null) {
      window.cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
  }

  useEffect(() => {
    const handleWindowPointerMove = (event) => {
      if (!interactionRef.current) return
      queuePointerUpdate(event.clientX, event.clientY)
    }

    const handleWindowPointerUp = () => {
      if (!interactionRef.current) return
      stopInteraction()
    }

    window.addEventListener('pointermove', handleWindowPointerMove)
    window.addEventListener('pointerup', handleWindowPointerUp)
    window.addEventListener('pointercancel', handleWindowPointerUp)

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove)
      window.removeEventListener('pointerup', handleWindowPointerUp)
      window.removeEventListener('pointercancel', handleWindowPointerUp)
      stopInteraction()
    }
  }, [queuePointerUpdate])

  const handleBoxPointerDown = (event) => {
    event.preventDefault()
    startInteraction('drag', event)
  }

  const handleResizePointerDown = (handle, event) => {
    event.preventDefault()
    event.stopPropagation()
    startInteraction('resize', event, handle)
  }

  return (
    <div className="image-cropper">
      {/* Container for image and crop overlay */}
      <div
        className="cropper-container"
        ref={containerRef}
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
