import { useEffect, useState } from 'react'
import MediaEntry from './MediaEntry'
import ImageEditor from './ImageEditor'
import FilterMain from './FilterMain'
import PresetFilters from './PresetFilters'
import PresetSizes from './PresetSizes'
import AddText from './AddText'
import ColorFilters from './ColorFilters'
import GifEditor from './GifEditor'
import useMediaSelection, { MEDIA_SELECTION_CODES } from '../hooks/useMediaSelection'
import CameraCapture from './CameraCapture'
import PhotoPreview from './PhotoPreview'
import {
  convertBackendImageResultToLocalMedia,
  cropImageFromBackend,
  exportImageFromBackend,
} from '../services/backendImageService'

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

const FILE_TOO_LARGE_MESSAGE = 'File is too large (max 50 MB).'
const HEIC_UNSUPPORTED_MESSAGE = 'HEIC/HEIF files are not supported in this browser yet. Please upload JPG or PNG.'

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
  const [originalBackendMediaId, setOriginalBackendMediaId] = useState(null)
  const [lastCropBoxPx, setLastCropBoxPx] = useState(null)

  const resetExportSessionState = () => {
    setSelectedPreset(null)
    setLatestExportResult(null)
    setLastExportLetterbox(null)
    setLetterboxColor('transparent')
    setExportError(null)
  }

  const resetImageEditingSessionState = () => {
    resetExportSessionState()
    setOriginalBackendMediaId(null)
    setLastCropBoxPx(null)
  }

  // TODO(refactor/editor): Centralize "effective preview" derivation (latest export vs hook result)
  // in useMediaSelection or a dedicated selector to keep this container as a screen coordinator.
  const effectiveBackendResult = latestExportResult?.id ? latestExportResult : backendImageResult
  const effectiveBackendMediaId = effectiveBackendResult?.id || null
  const effectiveImageSrc = effectiveBackendResult?.url || previewUrl

  useEffect(() => {
    if (mediaType !== 'image') return
    if (originalBackendMediaId) return
    if (!backendImageResult?.id) return

    setOriginalBackendMediaId(backendImageResult.id)
  }, [mediaType, originalBackendMediaId, backendImageResult])

  const handleImageSelect = async (file) => {
    if (!file) return

    setLastRejectedUploadType('image')

    const result = await selectImage(file)

    if (result?.code === MEDIA_SELECTION_CODES.UNSUPPORTED_IMAGE) {
      setUnsupportedImageMessage(HEIC_UNSUPPORTED_MESSAGE)
      setFileTooLargeMessage(null)
      return
    }

    if (result?.code === MEDIA_SELECTION_CODES.FILE_TOO_LARGE) {
      setUnsupportedImageMessage(null)
      setFileTooLargeMessage(FILE_TOO_LARGE_MESSAGE)
      return
    }

    if (result?.code !== MEDIA_SELECTION_CODES.OK) {
      return
    }

    setUnsupportedImageMessage(null)
    setFileTooLargeMessage(null)
    resetImageEditingSessionState()
    if (result?.applied) {
      setScreen(SCREENS.EDITOR)
    }
  }

  const [unsupportedVideo, setUnsupportedVideo] = useState(null)
  const handleVideoSelect = async (file) => {
    if (!file) return

    setLastRejectedUploadType('video')

    const result = await selectVideo(file)

    if (result?.code === MEDIA_SELECTION_CODES.FILE_TOO_LARGE) {
      setUnsupportedVideo(null)
      setFileTooLargeMessage(FILE_TOO_LARGE_MESSAGE)
      return
    }

    if (result?.code === MEDIA_SELECTION_CODES.UNSUPPORTED_VIDEO) {
      setFileTooLargeMessage(null)
      setUnsupportedVideo(file)
      return
    }

    if (result?.code !== MEDIA_SELECTION_CODES.OK) {
      return
    }

    setFileTooLargeMessage(null)
    setUnsupportedVideo(null)
    setLastCropBoxPx(null)
    if (result?.applied) {
      setScreen(SCREENS.EDITOR)
    }
  }

  const handleCameraSelect = () => {
    setScreen(SCREENS.CAMERA)
  }

  const handleBackToUpload = () => {
    resetSelection()
    resetImageEditingSessionState()
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

      const { file, objectUrl } = await convertBackendImageResultToLocalMedia(exported, {
        fallbackFileName: 'sticker.png',
        fallbackMimeType: 'image/png',
        fetchErrorMessage: 'Failed to load exported image preview.',
      })

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

  const handleCropApply = async (cropRequest) => {
    const cropSourceMediaId = originalBackendMediaId || effectiveBackendMediaId
    const ratioCrop = cropRequest?.ratio

    if (!cropSourceMediaId) {
      const err = new Error('Image is not ready for crop yet. Please re-upload and try again.')
      setExportError(err.message)
      throw err
    }

    if (!ratioCrop) {
      const err = new Error('Crop preview is not ready yet. Please try again.')
      setExportError(err.message)
      throw err
    }

    try {
      setExportError(null)
      const result = await cropImageFromBackend({
        mediaId: cropSourceMediaId,
        x: ratioCrop.x,
        y: ratioCrop.y,
        width: ratioCrop.width,
        height: ratioCrop.height,
        unit: cropRequest?.unit || 'ratio',
      })

      const { file, objectUrl } = await convertBackendImageResultToLocalMedia(result, {
        fallbackFileName: 'cropped.png',
        fallbackMimeType: 'image/png',
        fetchErrorMessage: 'Failed to fetch cropped image',
      })

      applyTransformedImage(file, objectUrl, result)
      setLatestExportResult(null)
      setLastExportLetterbox(null)
      setLastCropBoxPx(cropRequest?.pixels || null)
    } catch (err) {
      console.error('Error applying crop in container:', err)
      setExportError('Could not process the cropped image.')
      throw err
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

  const renderImageEditor = () => (
    <ImageEditor
      imageSrc={effectiveImageSrc}
      cropSourceImageSrc={sourceUrl || effectiveImageSrc}
      initialCropPx={lastCropBoxPx}
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

  const renderCameraCapture = () => (
    <CameraCapture
      onCapture={(file) => {
        setTempCapturedFile(file)
        setScreen(SCREENS.CAMERA_PREVIEW)
      }}
      onCancel={handleBackToUpload}
    />
  )

  const renderCameraPreview = () => (
    <PhotoPreview
      file={tempCapturedFile}
      onRetake={() => {
        setTempCapturedFile(null)
        setScreen(SCREENS.CAMERA)
      }}
      onConfirm={async () => {
        const file = tempCapturedFile
        setTempCapturedFile(null)

        if (file.type.startsWith('video/')) {
          await handleVideoSelect(file)
        } else {
          await handleImageSelect(file)
        }
      }}
      onBack={handleBackToUpload}
    />
  )

  const renderMediaEntry = () => (
    <MediaEntry
      onImageSelect={handleImageSelect}
      onVideoSelect={handleVideoSelect}
      onCameraSelect={handleCameraSelect}
      isLoading={isSelectionLoading || isUploading}
      selectionError={selectionError}
      validationError={validationError}
      unsupportedVideo={unsupportedVideo}
      fileTooLargeMessage={fileTooLargeMessage}
      unsupportedImageMessage={unsupportedImageMessage}
      lastRejectedUploadType={lastRejectedUploadType}
      onDismissUnsupportedVideo={() => setUnsupportedVideo(null)}
      onDismissFileTooLarge={() => setFileTooLargeMessage(null)}
      onDismissUnsupportedImage={() => setUnsupportedImageMessage(null)}
    />
  )

  const renderNoSelectionFlow = () => {
    if (screen === SCREENS.CAMERA) {
      return renderCameraCapture()
    }

    if (screen === SCREENS.CAMERA_PREVIEW) {
      return renderCameraPreview()
    }

    return renderMediaEntry()
  }

  const renderVideoFlow = () => {
    const videoKey = selectedMedia
      ? `${selectedMedia.name ?? selectedMedia.id ?? 'video'}-${selectedMedia.lastModified ?? ''}-${selectedMedia.size ?? ''}`
      : 'video'
    return <GifEditor key={videoKey} videoFile={selectedMedia} onCancel={handleBackToUpload} />
  }

  const renderImageFlow = () => {
    switch (screen) {
      case SCREENS.EDITOR:
        return renderImageEditor()
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
        return renderImageEditor()
    }
  }

  const renderContent = () => {
    if (!selectedMedia) {
      return renderNoSelectionFlow()
    }

    if (mediaType === 'video') {
      return renderVideoFlow()
    }

    return renderImageFlow()
  }

  return renderContent()
}

export default EditorContainer
