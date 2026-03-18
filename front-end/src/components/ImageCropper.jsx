import { useState } from 'react'

function ImageCropper({ imageSrc, onCropChange }) {
  const [cropData, setCropData] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  })

  const handleCropChange = (newCropData) => {
    setCropData(newCropData)
    if (onCropChange) {
      onCropChange(newCropData)
    }
  }

  return (
    <div className="image-cropper">
      <div className="cropper-container">
        <img src={imageSrc} alt="Cropping preview" className="cropper-image" />
        <div className="crop-overlay">
          {/* Crop UI will be added here */}
        </div>
      </div>
      <div className="cropper-info">
        <p>Cropping tools coming soon</p>
      </div>
    </div>
  )
}

export default ImageCropper
