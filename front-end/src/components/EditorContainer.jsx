import { useRef, useState } from 'react'
import CreateNew from './CreateNew'
import ImageEditor from './ImageEditor'
import FilterMain from './FilterMain'
import PresetFilters from './PresetFilters'
import PresetSizes from './PresetSizes'
import AddText from './AddText'
import ColorFilters from './ColorFilters'
import GifEditor from './GifEditor'
import useMediaSelection from '../hooks/useMediaSelection'
import { isVideoTypeSupported } from './videoSupport'
import CameraCapture from './CameraCapture'


const SCREENS = {
  EDITOR: 'editor',
  FILTERS_MAIN: 'filters-main',
  PRESET_FILTERS: 'preset',
  ADD_TEXT: 'text',
  COLOR_FILTERS: 'color',
  PRESET_SIZES: 'preset-sizes',
  CAMERA: 'camera',
}

const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024
const FILE_TOO_LARGE_MESSAGE = 'File is too large (max 50 MB).'
const HEIC_UNSUPPORTED_MESSAGE = 'HEIC/HEIF files are not supported in this browser yet. Please upload JPG or PNG.'

const isHeicFile = (file) => {
  if (!file) return false
  const lowerName = file.name?.toLowerCase() || ''
  const lowerType = file.type?.toLowerCase() || ''

  return (
    lowerName.endsWith('.heic') ||
    lowerName.endsWith('.heif') ||
    lowerType === 'image/heic' ||
    lowerType === 'image/heif'
  )
}

function resizeImageToDimensions(imageUrl, targetWidth, targetHeight, preserveAspect = false) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = targetWidth
      canvas.height = targetHeight
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, targetWidth, targetHeight)

      const imgAspect = img.width / img.height
      const targetAspect = targetWidth / targetHeight
      let sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight

      if (preserveAspect) {
        sWidth = img.width
        sHeight = img.height
        sx = 0
        sy = 0

        if (imgAspect > targetAspect) {
          dWidth = targetWidth
          dHeight = targetWidth / imgAspect
          dx = 0
          dy = (targetHeight - dHeight) / 2
        } else {
          dHeight = targetHeight
          dWidth = targetHeight * imgAspect
          dx = (targetWidth - dWidth) / 2
          dy = 0
        }
      } else {
        if (imgAspect > targetAspect) {
          sHeight = img.height
          sWidth = img.height * targetAspect
          sx = (img.width - sWidth) / 2
          sy = 0
        } else {
          sWidth = img.width
          sHeight = img.width / targetAspect
          sx = 0
          sy = (img.height - sHeight) / 2
        }
        dx = 0
        dy = 0
        dWidth = targetWidth
        dHeight = targetHeight
      }

      ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], 'sticker.png', { type: 'image/png' })
            resolve({ file, url: URL.createObjectURL(blob) })
          } else reject(new Error('Failed to create blob'))
        },
        'image/png'
      )
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = imageUrl
  })
}

function EditorContainer() {
  const {
    mediaType,
    selectedMedia,
    previewUrl,
    sourceUrl,
    backendImageResult,
    isUploading,
    uploadError,
    validationError,
    selectionError,
    isLoading: isSelectionLoading,
    selectImage,
    selectVideo,
    resetSelection,
    applyTransformedImage,
  } = useMediaSelection()

  const [screen, setScreen] = useState(SCREENS.EDITOR)
  const effectiveImageSrc = backendImageResult?.url || previewUrl
  const [fileTooLargeMessage, setFileTooLargeMessage] = useState(null)
  const [unsupportedImageMessage, setUnsupportedImageMessage] = useState(null)
  const [lastRejectedUploadType, setLastRejectedUploadType] = useState(null)
  const imageFileInputRef = useRef(null)
  const videoFileInputRef = useRef(null)

  const openImagePicker = () => {
    imageFileInputRef.current?.click()
  }

  const openVideoPicker = () => {
    videoFileInputRef.current?.click()
  }

  const handleImageSelect = async (file) => {
    if (!file) return

    setLastRejectedUploadType('image')

    if (isHeicFile(file)) {
      setUnsupportedImageMessage(HEIC_UNSUPPORTED_MESSAGE)
      return
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setFileTooLargeMessage(FILE_TOO_LARGE_MESSAGE)
      return
    }

    setUnsupportedImageMessage(null)
    setFileTooLargeMessage(null)
    const applied = await selectImage(file)
    if (applied) {
      setScreen(SCREENS.EDITOR)
    }
  }

  const [unsupportedVideo, setUnsupportedVideo] = useState(null)
  const handleVideoSelect = async (file) => {
    if (!file) return

    setLastRejectedUploadType('video')

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setFileTooLargeMessage(FILE_TOO_LARGE_MESSAGE)
      return
    }

    if (!isVideoTypeSupported(file)) {
      setUnsupportedVideo(file)
      return
    }
    setFileTooLargeMessage(null)
    setUnsupportedVideo(null)
    const applied = await selectVideo(file)
    if (applied) {
      setScreen(SCREENS.EDITOR)
    }
  }

  const handleCameraSelect = () => {
    setScreen(SCREENS.CAMERA)
  }

  const handleBackToUpload = () => {
    resetSelection()
    setScreen(SCREENS.EDITOR)
  }

  const handleOpenFilters = () => {
    setScreen(SCREENS.FILTERS_MAIN)
  }

  const handleApplyFilters = () => {
    setScreen(SCREENS.EDITOR)
  }

  const handleOpenSizes = () => {
    setScreen(SCREENS.PRESET_SIZES)
  }

  const handleSizeSelect = async (size) => {
    const imageUrl = sourceUrl || previewUrl
    if (!imageUrl) {
      setScreen(SCREENS.EDITOR)
      return
    }

    try {
      const { file, url } = await resizeImageToDimensions(
        imageUrl,
        size.width,
        size.height,
        false
      )

      if (previewUrl && previewUrl !== sourceUrl) {
        URL.revokeObjectURL(previewUrl)
      }

      applyTransformedImage(file, url)
    } catch (err) {
      console.error('Resize failed:', err)
    }

    setScreen(SCREENS.EDITOR)
  }

  const renderContent = () => {

    if (!selectedMedia) {
      if (screen === SCREENS.CAMERA) {
        return (
          <CameraCapture
            onCapture={async (file) => {
              setScreen(SCREENS.EDITOR)

              if (file.type.startsWith('video/')) {
                await handleVideoSelect(file)
              } else {
                await handleImageSelect(file)
              }
            }}
            onCancel={handleBackToUpload}
          />
        )
      }
      
      return <>
        <input
          ref={imageFileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) {
              handleImageSelect(file)
            }
            event.target.value = ''
          }}
        />
        <input
          ref={videoFileInputRef}
          type="file"
          accept="video/*"
          style={{ display: 'none' }}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) {
              handleVideoSelect(file)
            }
            event.target.value = ''
          }}
        />
        <CreateNew
          onImageSelect={handleImageSelect}
          onVideoSelect={handleVideoSelect}
          onCameraSelect={handleCameraSelect}
          isLoading={isSelectionLoading || isUploading}
          selectionError={selectionError}
          validationError={validationError}
        />
        {unsupportedVideo && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="modal-content" style={{ background: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 16px rgba(0,0,0,0.2)', maxWidth: 360, textAlign: 'center' }}>
              <h3 style={{ color: '#c00', marginBottom: '1rem' }}>Unsupported Video Format</h3>
              <p style={{ marginBottom: '1.5rem' }}>
                This video format ({unsupportedVideo.type || unsupportedVideo.name.split('.').pop()}) is not supported by your browser.<br />
                Please upload an MP4 or WebM video.
              </p>
              <button
                className="btn-primary"
                style={{ marginBottom: '1rem' }}
                onClick={() => {
                  setUnsupportedVideo(null)
                  openVideoPicker()
                }}
              >
                Re-upload Video
              </button>
            </div>
          </div>
        )}

        {fileTooLargeMessage && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="modal-content" style={{ background: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 16px rgba(0,0,0,0.2)', maxWidth: 360, textAlign: 'center' }}>
              <h3 style={{ color: '#c00', marginBottom: '1rem' }}>Upload Error</h3>
              <p style={{ marginBottom: '1.5rem' }}>{fileTooLargeMessage}</p>
              <button
                className="btn-primary"
                style={{ marginBottom: '1rem' }}
                onClick={() => {
                  setFileTooLargeMessage(null)
                  if (lastRejectedUploadType === 'video') {
                    openVideoPicker()
                    return
                  }
                  if (lastRejectedUploadType === 'image') {
                    openImagePicker()
                  }
                }}
              >
                Re-upload
              </button>
            </div>
          </div>
        )}

        {unsupportedImageMessage && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="modal-content" style={{ background: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 16px rgba(0,0,0,0.2)', maxWidth: 360, textAlign: 'center' }}>
              <h3 style={{ color: '#c00', marginBottom: '1rem' }}>Unsupported Image Format</h3>
              <p style={{ marginBottom: '1.5rem' }}>{unsupportedImageMessage}</p>
              <button
                className="btn-primary"
                style={{ marginBottom: '1rem' }}
                onClick={() => {
                  setUnsupportedImageMessage(null)
                  openImagePicker()
                }}
              >
                Re-upload
              </button>
            </div>
          </div>
        )}
      </>
    }

    if (mediaType === 'video') {
      const videoKey = selectedMedia
        ? `${selectedMedia.name ?? selectedMedia.id ?? 'video'}-${selectedMedia.lastModified ?? ''}-${selectedMedia.size ?? ''}`
        : 'video'
      return <GifEditor key={videoKey} videoFile={selectedMedia} onCancel={handleBackToUpload} />
    }

    switch (screen) {
      case SCREENS.EDITOR:
        return (
          <ImageEditor
            imageSrc={effectiveImageSrc}
            isUploading={isUploading}
            uploadError={uploadError}
            onBack={handleBackToUpload}
            onOpenFilters={handleOpenFilters}
            onSize={handleOpenSizes}
          />
        )
      case SCREENS.FILTERS_MAIN:
        return (
          <FilterMain
            onPresetFilters={() => setScreen(SCREENS.PRESET_FILTERS)}
            onAddText={() => setScreen(SCREENS.ADD_TEXT)}
            onColorFilters={() => setScreen(SCREENS.COLOR_FILTERS)}
          />
        )
      case SCREENS.PRESET_FILTERS:
        return (
          <PresetFilters
            imageSrc={effectiveImageSrc}
            onApply={handleApplyFilters}
            onCancel={() => setScreen(SCREENS.EDITOR)}
          />
        )
      case SCREENS.ADD_TEXT:
        return (
          <AddText
            imageSrc={effectiveImageSrc}
            onApply={handleApplyFilters}
            onCancel={() => setScreen(SCREENS.EDITOR)}
          />
        )
      case SCREENS.COLOR_FILTERS:
        return (
          <ColorFilters
            imageSrc={effectiveImageSrc}
            onApply={handleApplyFilters}
            onCancel={() => setScreen(SCREENS.EDITOR)}
          />
        )
      case SCREENS.PRESET_SIZES:
        return (
          <PresetSizes
            onSelect={handleSizeSelect}
            onCancel={() => setScreen(SCREENS.EDITOR)}
          />
        )
      default:
        return (
          <ImageEditor
            imageSrc={effectiveImageSrc}
            isUploading={isUploading}
            uploadError={uploadError}
            onBack={handleBackToUpload}
            onOpenFilters={handleOpenFilters}
            onSize={handleOpenSizes}
          />
        )
    }
  }

  return renderContent()
}

export default EditorContainer
