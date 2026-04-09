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
import { isVideoTypeSupported } from '../utils/videoSupport'
import CameraCapture from './CameraCapture'
import PhotoPreview from './PhotoPreview'
import { exportImageFromBackend } from '../services/backendImageService'

const SCREENS = {
  EDITOR: 'editor',
  FILTERS_MAIN: 'filters-main',
  PRESET_FILTERS: 'preset',
  ADD_TEXT: 'text',
  COLOR_FILTERS: 'color',
  PRESET_SIZES: 'preset-sizes',
  CAMERA: 'camera',
  CAMERA_PREVIEW: 'camera-preview'
}

const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024
const FILE_TOO_LARGE_MESSAGE = 'File is too large (max 50 MB).'
const HEIC_UNSUPPORTED_MESSAGE = 'HEIC/HEIF files are not supported in this browser yet. Please upload JPG or PNG.'

// TODO(refactor/editor): Move media validation rules/constants into a shared media-validation module
// so selection handlers can focus on orchestration only.
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
  const [fileTooLargeMessage, setFileTooLargeMessage] = useState(null)
  const [unsupportedImageMessage, setUnsupportedImageMessage] = useState(null)
  const [lastRejectedUploadType, setLastRejectedUploadType] = useState(null)
  const [tempCapturedFile, setTempCapturedFile] = useState(null)
  const [selectedPreset, setSelectedPreset] = useState(null)
  const [latestExportResult, setLatestExportResult] = useState(null)
  const [lastExportLetterbox, setLastExportLetterbox] = useState(null)
  const [letterboxColor, setLetterboxColor] = useState('transparent')
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState(null)
  const imageFileInputRef = useRef(null)
  const videoFileInputRef = useRef(null)

  // TODO(refactor/editor): Centralize "effective preview" derivation (latest export vs hook result)
  // in useMediaSelection or a dedicated selector to keep this container as a screen coordinator.
  const effectiveBackendResult = latestExportResult?.id ? latestExportResult : backendImageResult
  const effectiveBackendMediaId = effectiveBackendResult?.id || null
  const effectiveImageSrc = effectiveBackendResult?.url || previewUrl

  const openImagePicker = () => {
    imageFileInputRef.current?.click()
  }

  const openVideoPicker = () => {
    videoFileInputRef.current?.click()
  }

  const handleImageSelect = async (file) => {
    if (!file) return

    setLastRejectedUploadType('image')

    // TODO(refactor/editor): Replace inline validation branches with a single validator result
    // (e.g., { ok, code, message }) consumed by UI state mapping.
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
    setSelectedPreset(null)
    setLatestExportResult(null)
    setLastExportLetterbox(null)
    setLetterboxColor('transparent')
    setExportError(null)
    const applied = await selectImage(file)
    if (applied) {
      setScreen(SCREENS.EDITOR)
    }
  }

  const [unsupportedVideo, setUnsupportedVideo] = useState(null)
  const handleVideoSelect = async (file) => {
    if (!file) return

    setLastRejectedUploadType('video')

    // TODO(refactor/editor): Mirror image/video validation through one shared decision helper
    // to avoid duplicated rejection handling and picker retry logic.
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
    setSelectedPreset(null)
    setLatestExportResult(null)
    setLastExportLetterbox(null)
    setLetterboxColor('transparent')
    setExportError(null)
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
    if (!effectiveBackendMediaId) {
      setExportError('Image is not ready for backend export yet. Please re-upload and try again.')
      setScreen(SCREENS.EDITOR)
      return
    }

    try {
      setIsExporting(true)
      setExportError(null)

      const exported = await exportImageFromBackend({
        mediaId: effectiveBackendMediaId,
        width: size.width,
        height: size.height,
        letterboxColor,
      })

      const response = await fetch(exported.url)
      if (!response.ok) {
        throw new Error('Failed to load exported image preview.')
      }
      const blob = await response.blob()
      const file = new File([blob], exported.fileName || 'sticker.png', {
        type: exported.mimeType || 'image/png',
      })
      const objectUrl = URL.createObjectURL(blob)

      if (previewUrl && previewUrl !== sourceUrl) {
        URL.revokeObjectURL(previewUrl)
      }

  applyTransformedImage(file, objectUrl, exported)
      setSelectedPreset(size)
      setLatestExportResult(exported)
      setLastExportLetterbox(letterboxColor)
    } catch (err) {
      console.error('Preset export failed:', err)
      setExportError(err?.message || 'Failed to export image at the selected size.')
    } finally {
      setIsExporting(false)
    }

    setScreen(SCREENS.EDITOR)
  }

  const handleCropApply = async (result) => {
    // TODO(refactor/editor): Keep crop apply orchestration-only (state transitions + delegation).
    // Move result-fetch/blob/file normalization into backend image service.
    try {
      const response = await fetch(result.url)
      if (!response.ok) throw new Error("Failed to fetch cropped image")
      
      const blob = await response.blob()
      const file = new File([blob], 'cropped.png', { type: 'image/png' })
      const objectUrl = URL.createObjectURL(blob)

      applyTransformedImage(file, objectUrl, result)
      setLatestExportResult(null)
      setLastExportLetterbox(null)
    } catch (err) {
      console.error("Error applying crop in container:", err)
      setExportError("Could not process the cropped image.")
    }
  }


  const handleExport = async () => {
    if (mediaType !== 'image') return
    if (!selectedPreset) {
      setExportError('Please choose a preset size before exporting.')
      return
    }
    if (!effectiveBackendMediaId) {
      setExportError('Image is not ready for backend export yet. Please re-upload and try again.')
      return
    }

    try {
      setIsExporting(true)
      setExportError(null)
      const dimsMatch =
        latestExportResult &&
        latestExportResult.width === selectedPreset.width &&
        latestExportResult.height === selectedPreset.height
      const letterboxMatch = lastExportLetterbox === letterboxColor

      const exported =
        dimsMatch && letterboxMatch
          ? latestExportResult
          : await exportImageFromBackend({
              mediaId: effectiveBackendMediaId,
              width: selectedPreset.width,
              height: selectedPreset.height,
              letterboxColor,
            })

      setLatestExportResult(exported)
      setLastExportLetterbox(letterboxColor)
      const link = document.createElement('a')
      link.href = exported.downloadUrl || exported.url
      link.download = exported.fileName || 'sticker.png'
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      console.error('Download export failed:', err)
      setExportError(err?.message || 'Failed to download exported image.')
    } finally {
      setIsExporting(false)
    }
  }

  const renderContent = () => {
    // TODO(refactor/editor): Split this into route-level render functions/components.
    // Upload flow, camera flow, and modal stack are currently mixed with editor routing.
    if (!selectedMedia) {
      if (screen === SCREENS.CAMERA) {
        return (
          <CameraCapture
            onCapture={(file) => {
              setTempCapturedFile(file)
              setScreen(SCREENS.CAMERA_PREVIEW)
            }}
            onCancel={handleBackToUpload}
          />
        )
      }

      if (screen === SCREENS.CAMERA_PREVIEW){
        return (
          <PhotoPreview
            file={tempCapturedFile}
            onRetake={() =>{
              setTempCapturedFile(null)
              setScreen(SCREENS.CAMERA)
            }}
            onConfirm={ async () => {
              const file = tempCapturedFile
              setTempCapturedFile(null)

              if (file.type.startsWith('video/')) {
                await handleVideoSelect(file)
              } else {
                await handleImageSelect(file)
              }
            }
          }
          onBack={handleBackToUpload}
          />
        )
      }

      return (
        <>
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
      )
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
            backendMediaId={effectiveBackendMediaId}
            onCropApply={handleCropApply}
            isUploading={isUploading}
            isExporting={isExporting}
            uploadError={uploadError}
            exportError={exportError}
            onBack={handleBackToUpload}
            onOpenFilters={handleOpenFilters}
            onSize={handleOpenSizes}
            onExport={handleExport}
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
            letterboxColor={letterboxColor}
            onLetterboxColorChange={setLetterboxColor}
            onSelect={handleSizeSelect}
            onCancel={() => setScreen(SCREENS.EDITOR)}
          />
        )
      default:
        return (
          <ImageEditor
            imageSrc={effectiveImageSrc}
            backendMediaId={effectiveBackendMediaId}
            onCropApply={handleCropApply}
            isUploading={isUploading}
            isExporting={isExporting}
            uploadError={uploadError}
            exportError={exportError}
            onBack={handleBackToUpload}
            onOpenFilters={handleOpenFilters}
            onSize={handleOpenSizes}
            onExport={handleExport}
          />
        )
    }
  }

  return renderContent()
}

export default EditorContainer
