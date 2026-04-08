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
    const rect = containerRef.current.getBoundingClientRect();
    if (e.target.classList.contains('crop-handle')) {
      setIsResizing(e.target.dataset.handle);
      setDragStart({ 
        x: e.clientX, 
        y: e.clientY,
        initialCrop: { ...cropData } 
      });
    } else if (e.target.classList.contains('crop-box')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - cropData.x,
        y: e.clientY - cropData.y,
      });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging && !isResizing) return;

    if (isDragging) {
      const newX = Math.max(0, Math.min(e.clientX - dragStart.x, containerSize.width - cropData.width));
      const newY = Math.max(0, Math.min(e.clientY - dragStart.y, containerSize.height - cropData.height));
      
      const updated = { ...cropData, x: newX, y: newY };
      setCropData(updated);
      onCropChange?.(updated);
    }

    if (isResizing) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      const { initialCrop } = dragStart;
      let nextCrop = { ...initialCrop };

      // Calculate new dimensions based on the initial snapshot + total mouse movement
      if (isResizing.includes('e')) nextCrop.width = Math.max(20, initialCrop.width + dx);
      if (isResizing.includes('s')) nextCrop.height = Math.max(20, initialCrop.height + dy);
      
      if (isResizing.includes('w')) {
        const maxWidth = initialCrop.x + initialCrop.width;
        nextCrop.x = Math.max(0, Math.min(initialCrop.x + dx, maxWidth - 20));
        nextCrop.width = maxWidth - nextCrop.x;
      }
      
      if (isResizing.includes('n')) {
        const maxHeight = initialCrop.y + initialCrop.height;
        nextCrop.y = Math.max(0, Math.min(initialCrop.y + dy, maxHeight - 20));
        nextCrop.height = maxHeight - nextCrop.y;
      }

      // Boundary Enforcement
      if (nextCrop.x + nextCrop.width > containerSize.width) nextCrop.width = containerSize.width - nextCrop.x;
      if (nextCrop.y + nextCrop.height > containerSize.height) nextCrop.height = containerSize.height - nextCrop.y;

      setCropData(nextCrop);
      onCropChange?.(nextCrop);
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
