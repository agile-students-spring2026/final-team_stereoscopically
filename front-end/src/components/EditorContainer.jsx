import { useState } from 'react'
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

const SCREENS = {
  EDITOR: 'editor',
  FILTERS_MAIN: 'filters-main',
  PRESET_FILTERS: 'preset',
  ADD_TEXT: 'text',
  COLOR_FILTERS: 'color',
  PRESET_SIZES: 'preset-sizes',
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
    isLoading: isSelectionLoading,
    error: selectionError,
    selectImage,
    selectVideo,
    resetSelection,
    applyTransformedImage,
  } = useMediaSelection({ autoBootstrap: false })

  const [screen, setScreen] = useState(SCREENS.EDITOR)

  const handleImageSelect = async () => {
    const applied = await selectImage()
    if (applied) {
      setScreen(SCREENS.EDITOR)
    }
  }

  const [unsupportedVideo, setUnsupportedVideo] = useState(null)
  const handleVideoSelect = async (file) => {
    if (!file) return
    if (!isVideoTypeSupported(file)) {
      setUnsupportedVideo(file)
      return
    }
    setUnsupportedVideo(null)
    const applied = await selectVideo(file)
    if (applied) {
      setScreen(SCREENS.EDITOR)
    }
  }

  const handleCameraSelect = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      const track = stream.getVideoTracks()[0]
      const imageCapture = new ImageCapture(track)
      const blob = await imageCapture.takePhoto()
      const file = new File([blob], 'camera.png', { type: 'image/png' })
      track.stop()
      await selectImage(file)
      setScreen(SCREENS.EDITOR)
    } catch (err) {
      console.error('Camera error:', err)
    }
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
    if (!size.width || !size.height) {
      setScreen(SCREENS.EDITOR)
      return
    }

    if (!sourceUrl) {
      setScreen(SCREENS.EDITOR)
      return
    }

    try {
      const shouldPreserveAspect = size.id === 'discord-sticker'
      const { file, url } = await resizeImageToDimensions(
        sourceUrl,
        size.width,
        size.height,
        shouldPreserveAspect
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
      return <>
        <CreateNew
          onImageSelect={handleImageSelect}
          onVideoSelect={handleVideoSelect}
          onCameraSelect={handleCameraSelect}
          isLoading={isSelectionLoading}
          errorMessage={selectionError}
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
                onClick={() => setUnsupportedVideo(null)}
              >
                Re-upload Video
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
            imageSrc={previewUrl}
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
            imageSrc={previewUrl}
            onApply={handleApplyFilters}
            onCancel={() => setScreen(SCREENS.EDITOR)}
          />
        )
      case SCREENS.ADD_TEXT:
        return (
          <AddText
            imageSrc={previewUrl}
            onApply={handleApplyFilters}
            onCancel={() => setScreen(SCREENS.EDITOR)}
          />
        )
      case SCREENS.COLOR_FILTERS:
        return (
          <ColorFilters
            imageSrc={previewUrl}
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
            imageSrc={previewUrl}
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
