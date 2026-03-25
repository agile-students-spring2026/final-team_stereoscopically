import { useEffect, useRef, useState } from 'react'

const CreateNew = ({ onImageSelect, onVideoSelect }) => {
  const [cameraStream, setCameraStream] = useState(null)
  const videoRef = useRef(null)

  const handleImageChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    onImageSelect?.(file)
  }

  const handleVideoChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    onVideoSelect?.(file)
  }

  const handleOpenCamera = () => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        setCameraStream(stream)
      })
  }

  useEffect (() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream
    }
  }, [cameraStream])

  return (
    <div className="card create-new">
      <h2>Create New</h2>

      <div className="upload-options">
        <label htmlFor="image-upload" className="upload-button">
          Upload Image
        </label>

        <input
          id="image-upload"
          type="file"
          accept="image/*"
          className="hidden-file-input"
          onChange={handleImageChange}
        />

        <label htmlFor="video-upload" className="upload-button">
          Upload Video
        </label>

        <input
          id="video-upload"
          type="file"
          accept="video/*"
          className="hidden-file-input"
          onChange={handleVideoChange}
        />

        <label className="upload-button" onClick={handleOpenCamera}>
          Open Camera
        </label>
      </div>

      {cameraStream && (
        <video
          ref = {videoRef}
          autoPlay
          playsInline
          style = {{width: '100%', marginTop: '12px', borderRadius: '12px'}}
        />
      )}
    </div>
  )
}

export default CreateNew