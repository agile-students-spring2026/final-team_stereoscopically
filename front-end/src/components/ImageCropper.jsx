import { useState, useRef, useEffect } from 'react'

function ImageCropper({ imageSrc, onCropChange }) {
  // Tracks crop box position and size
  const [cropData, setCropData] = useState({
    x: 50,
    y: 50,
    width: 200,
    height: 200,
  })
  // Tracks if user is currently dragging the crop box
  const [isDragging, setIsDragging] = useState(false)
  // Stores initial mouse position when drag starts
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  // Tracks which corner handle is being resized (nw, ne, sw, se)
  const [isResizing, setIsResizing] = useState(null)
  // Reference to container element for measuring size
  const containerRef = useRef(null)
  // Stores container width and height for boundary calculations
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  // Measure container size when image loads
  useEffect(() => {
    if (containerRef.current) {
      setContainerSize({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      })
    }
  }, [imageSrc])

  // Handle mouse down on crop box or handles
  const handleMouseDown = (e) => {
    if (e.target.classList.contains('crop-handle')) {
      // Start resizing if clicking a corner handle
      const handle = e.target.dataset.handle
      setIsResizing(handle)
      setDragStart({ x: e.clientX, y: e.clientY })
    } else if (e.target.classList.contains('crop-box')) {
      // Start dragging if clicking the crop box
      setIsDragging(true)
      setDragStart({
        x: e.clientX - cropData.x,
        y: e.clientY - cropData.y,
      })
    }
  }

  // Handle mouse movement for dragging and resizing
  const handleMouseMove = (e) => {
    if (!isDragging && !isResizing) return

    // Handle dragging the entire crop box
    if (isDragging) {
      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y

      // Keep crop box within container boundaries
      const boundedX = Math.max(
        0,
        Math.min(newX, containerSize.width - cropData.width)
      )
      const boundedY = Math.max(
        0,
        Math.min(newY, containerSize.height - cropData.height)
      )

      const newCropData = { ...cropData, x: boundedX, y: boundedY }
      setCropData(newCropData)
      if (onCropChange) onCropChange(newCropData)
    }

    // Handle resizing from corner handles
    if (isResizing) {
      const deltaX = e.clientX - dragStart.x
      const deltaY = e.clientY - dragStart.y
      let newCrop = { ...cropData }

      // Different logic for each corner handle
      switch (isResizing) {
        case 'se':
          // Southeast: expand width and height
          newCrop.width = Math.max(50, cropData.width + deltaX)
          newCrop.height = Math.max(50, cropData.height + deltaY)
          break
        case 'sw':
          // Southwest: move left, shrink width, expand height
          newCrop.x = cropData.x + deltaX
          newCrop.width = Math.max(50, cropData.width - deltaX)
          newCrop.height = Math.max(50, cropData.height + deltaY)
          break
        case 'ne':
          // Northeast: move up, expand width, shrink height
          newCrop.y = cropData.y + deltaY
          newCrop.width = Math.max(50, cropData.width + deltaX)
          newCrop.height = Math.max(50, cropData.height - deltaY)
          break
        case 'nw':
          // Northwest: move up and left, shrink both dimensions
          newCrop.x = cropData.x + deltaX
          newCrop.y = cropData.y + deltaY
          newCrop.width = Math.max(50, cropData.width - deltaX)
          newCrop.height = Math.max(50, cropData.height - deltaY)
          break
        default:
          break
      }

      setCropData(newCrop)
      if (onCropChange) onCropChange(newCrop)
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }

  // Stop dragging or resizing when mouse is released
  const handleMouseUp = () => {
    setIsDragging(false)
    setIsResizing(null)
  }

  return (
    <div className="image-cropper">
      {/* Container for image and crop overlay */}
      <div
        className="cropper-container"
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img src={imageSrc} alt="Cropping preview" className="cropper-image" />
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
            onMouseDown={handleMouseDown}
          >
            {/* Corner handles for resizing */}
            <div
              className="crop-handle"
              data-handle="nw"
              style={{ top: 0, left: 0 }}
            />
            <div
              className="crop-handle"
              data-handle="ne"
              style={{ top: 0, right: 0 }}
            />
            <div
              className="crop-handle"
              data-handle="sw"
              style={{ bottom: 0, left: 0 }}
            />
            <div
              className="crop-handle"
              data-handle="se"
              style={{ bottom: 0, right: 0 }}
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
