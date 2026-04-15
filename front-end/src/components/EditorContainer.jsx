import { useCallback, useState } from 'react'
import MediaEntry from './MediaEntry'
import ImageEditor from './image/ImageEditor'
import FilterMain from './FilterMain'
import PresetFilters from './image/PresetFilters'
import PresetSizes from './image/PresetSizes'
import AddText from './image/AddText'
import ColorFilters from './image/ColorFilters'
import GifEditor from './gif/GifEditor'
import useMediaSelection, { MEDIA_SELECTION_CODES } from '../hooks/useMediaSelection'
import useGifConversion from '../hooks/useGifConversion'
import useImageEditingSession from '../hooks/useImageEditingSession'
import { convertBackendImageResultToLocalMedia } from '../services/backendImageService'
import CameraCapture from './CameraCapture'
import PhotoPreview from './PhotoPreview'
import VideoPresetFilters from './gif/VideoPresetFilters'
import GifFilterMain from './gif/GifFilterMain'
import GifToolPlaceholder from './gif/GifToolPlaceholder'
import GifSpeedControls from './gif/GifSpeedControls'
import {
  createInitialGifFlowState,
  GIF_FLOW_TOOLS,
  setGifFlowActiveTool,
  setGifFlowSelectedSpeed,
} from './gif/gifFlowState'

const SCREENS = {
  EDITOR: 'editor',
  FILTERS_MAIN: 'filters-main',
  IMAGE_PRESET_FILTERS: 'image-preset-filters',
  ADD_TEXT: 'text',
  COLOR_FILTERS: 'color',
  PRESET_SIZES: 'preset-sizes',
  CAMERA: 'camera',
  CAMERA_PREVIEW: 'camera-preview',
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

  const { createGif, exportGif } = useGifConversion()

  const {
    letterboxColor,
    setLetterboxColor,
    isExporting,
    exportError,
    sessionNotice,
    lastCropBoxPx,
    effectiveImageSrc,
    effectiveBackendMediaId,
    selectedPreset,
    latestExportResult,
    resetImageEditingSessionState,
    resetPresetExportSettings,
    invalidateLatestExport,
    clearCropSession,
    handleSizeSelect,
    handleCropApply,
    handleAddTextApply,
    handleExport,
  } = useImageEditingSession({
    mediaType,
    backendImageResult,
    previewUrl,
    sourceUrl,
    applyTransformedImage,
  })

  const [screen, setScreen] = useState(SCREENS.EDITOR)
  const [gifFlowState, setGifFlowState] = useState(createInitialGifFlowState)
  const [fileTooLargeMessage, setFileTooLargeMessage] = useState(null)
  const [unsupportedImageMessage, setUnsupportedImageMessage] = useState(null)
  const [lastRejectedUploadType, setLastRejectedUploadType] = useState(null)
  const [tempCapturedFile, setTempCapturedFile] = useState(null)

  const resetGifToolState = useCallback(() => {
    setGifFlowState((prev) => setGifFlowActiveTool(prev, GIF_FLOW_TOOLS.EDITOR))
  }, [])

  const openGifTool = useCallback((nextTool) => {
    setGifFlowState((prev) => setGifFlowActiveTool(prev, nextTool))
  }, [])

  const handleGifSpeedSelect = useCallback((nextSpeedPlaybackRate) => {
    setGifFlowState((prev) => setGifFlowSelectedSpeed(prev, nextSpeedPlaybackRate))
  }, [])

  const handleGifExport = useCallback(
    async (mediaId, selectedSpeedPlaybackRate) => {
      return exportGif(mediaId, selectedSpeedPlaybackRate)
    },
    [exportGif]
  )

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
    clearCropSession()
    if (result?.applied) {
      setGifFlowState(createInitialGifFlowState())
      setScreen(SCREENS.EDITOR)
    }
  }

  const handleCameraSelect = () => {
    setScreen(SCREENS.CAMERA)
  }

  const handleBackToUpload = () => {
    resetSelection()
    resetImageEditingSessionState()
    setGifFlowState(createInitialGifFlowState())
    setScreen(SCREENS.EDITOR)
  }

  const handleOpenFilters = () => {
    setScreen(SCREENS.FILTERS_MAIN)
  }

  const handleColorFiltersCommit = useCallback(
    async (backendResult) => {
      const { file, objectUrl } = await convertBackendImageResultToLocalMedia(backendResult, {
        fetchErrorMessage: 'Failed to load adjusted image.',
      })
      if (previewUrl && previewUrl !== sourceUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      applyTransformedImage(file, objectUrl, backendResult)
      invalidateLatestExport()
      setScreen(SCREENS.EDITOR)
    },
    [applyTransformedImage, invalidateLatestExport, previewUrl, sourceUrl]
  )

  const handleImagePresetFiltersCommit = useCallback(
    async (result) => {
      if (!result) {
        setScreen(SCREENS.EDITOR)
        return
      }
      const { file, objectUrl } = await convertBackendImageResultToLocalMedia(result, {
        fetchErrorMessage: 'Failed to load preset image.',
      })
      if (previewUrl && previewUrl !== sourceUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      applyTransformedImage(file, objectUrl, result)
      invalidateLatestExport()
      setScreen(SCREENS.EDITOR)
    },
    [applyTransformedImage, invalidateLatestExport, previewUrl, sourceUrl]
  )

  const handleOpenSizes = () => {
    setScreen(SCREENS.PRESET_SIZES)
  }

  const handleVideoPresetApply = useCallback(
    async (result) => {
      if (!result?.url) {
        resetGifToolState()
        setScreen(SCREENS.EDITOR)
        return
      }

      const response = await fetch(result.url)
      if (!response.ok) {
        throw new Error('Failed to load filtered video.')
      }

      const blob = await response.blob()
      const mimeType = result?.mimeType || blob.type || 'video/mp4'
      const fileName = `filtered-${result?.preset || 'video'}.mp4`
      const filteredFile = new File([blob], fileName, { type: mimeType })

      const selection = await selectVideo(filteredFile)
      if (selection?.code !== MEDIA_SELECTION_CODES.OK) {
        throw new Error('Filtered video could not be loaded in editor.')
      }

      resetGifToolState()
      setScreen(SCREENS.EDITOR)
    },
    [resetGifToolState, selectVideo]
  )

  const handlePresetSizeSelect = async (size) => {
    await handleSizeSelect(size)
    setScreen(SCREENS.EDITOR)
  }

  const handleAddTextScreenApply = async (textRequest) => {
    const applied = await handleAddTextApply(textRequest)
    if (applied) {
      setScreen(SCREENS.EDITOR)
    }
  }

  const renderImageEditor = () => (
    <ImageEditor
      imageSrc={effectiveImageSrc}
      cropSourceImageSrc={effectiveImageSrc}
      initialCropPx={lastCropBoxPx}
      onCropApply={handleCropApply}
      isUploading={isUploading}
      isExporting={isExporting}
      uploadError={uploadError}
      exportError={exportError}
      sessionNotice={sessionNotice}
      onBack={handleBackToUpload}
      onOpenFilters={handleOpenFilters}
      onSize={handleOpenSizes}
      onExport={handleExport}
      onResetExportSettings={resetPresetExportSettings}
      showResetExportSettings={Boolean(selectedPreset || latestExportResult)}
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
    return (
      <GifEditor
          key={videoKey}
          videoFile={selectedMedia}
          selectedSpeedPlaybackRate={gifFlowState.selectedSpeedPlaybackRate}
          onCancel={handleBackToUpload}
          onCreateGif={createGif}
          onExportGif={handleGifExport}
    onOpenResize={() => openGifTool(GIF_FLOW_TOOLS.RESIZE)}
      onOpenFilters={() => openGifTool(GIF_FLOW_TOOLS.FILTERS_MAIN)}
      />
    )
  }

  const renderImageFlow = () => {
    switch (screen) {
      case SCREENS.EDITOR:
        return renderImageEditor()
      case SCREENS.FILTERS_MAIN:
        return (
          <FilterMain
            onPresetFilters={() => setScreen(SCREENS.IMAGE_PRESET_FILTERS)}
            onAddText={() => setScreen(SCREENS.ADD_TEXT)}
            onColorFilters={() => setScreen(SCREENS.COLOR_FILTERS)}
          />
        )
      case SCREENS.IMAGE_PRESET_FILTERS:
        return (
          <PresetFilters
            imageSrc={effectiveImageSrc}
            mediaId={effectiveBackendMediaId}
            onApply={handleImagePresetFiltersCommit}
            onCancel={() => setScreen(SCREENS.EDITOR)}
            applyError={exportError}
          />
        )
      case SCREENS.ADD_TEXT:
        return (
          <AddText
            imageSrc={effectiveImageSrc}
            onApply={handleAddTextScreenApply}
            onCancel={() => setScreen(SCREENS.EDITOR)}
            applyError={exportError}
          />
        )
      case SCREENS.COLOR_FILTERS:
        return (
          <ColorFilters
            imageSrc={effectiveImageSrc}
            mediaId={effectiveBackendMediaId}
            onApply={handleColorFiltersCommit}
            onCancel={() => setScreen(SCREENS.EDITOR)}
            applyError={exportError}
          />
        )
      case SCREENS.PRESET_SIZES:
        return (
          <PresetSizes
            letterboxColor={letterboxColor}
            onLetterboxColorChange={setLetterboxColor}
            onSelect={handlePresetSizeSelect}
            onCancel={() => setScreen(SCREENS.EDITOR)}
            isBusy={isExporting}
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
      if (gifFlowState.activeTool === GIF_FLOW_TOOLS.FILTERS_MAIN) {
        return (
          <GifFilterMain
            onPresetFilters={() => openGifTool(GIF_FLOW_TOOLS.PRESET_FILTERS)}
            onTextOverlay={() => openGifTool(GIF_FLOW_TOOLS.TEXT)}
            onSpeed={() => openGifTool(GIF_FLOW_TOOLS.SPEED)}
            onCancel={resetGifToolState}
          />
        )
      }

      if (gifFlowState.activeTool === GIF_FLOW_TOOLS.PRESET_FILTERS) {
        return (
          <VideoPresetFilters
            videoFile={selectedMedia}
            onApply={handleVideoPresetApply}
            onCancel={() => openGifTool(GIF_FLOW_TOOLS.FILTERS_MAIN)}
          />
        )
      }

      if (gifFlowState.activeTool === GIF_FLOW_TOOLS.TEXT) {
        return (
          <GifToolPlaceholder
            title="Text"
            description="Text overlay controls for GIFs will be added in the next step."
            onBack={() => openGifTool(GIF_FLOW_TOOLS.FILTERS_MAIN)}
            onCancel={resetGifToolState}
          />
        )
      }

      if (gifFlowState.activeTool === GIF_FLOW_TOOLS.SPEED) {
        return (
          <GifSpeedControls
            selectedSpeedPlaybackRate={gifFlowState.selectedSpeedPlaybackRate}
            onSelectSpeed={handleGifSpeedSelect}
            onBack={() => openGifTool(GIF_FLOW_TOOLS.FILTERS_MAIN)}
            onCancel={resetGifToolState}
          />
        )
      }

      if (gifFlowState.activeTool === GIF_FLOW_TOOLS.RESIZE) {
        return (
          <GifToolPlaceholder
            title="Resize"
            description="Resize controls for GIFs will be added in the next step."
            onBack={resetGifToolState}
            onCancel={resetGifToolState}
          />
        )
      }

      return renderVideoFlow()
    }

    return renderImageFlow()
  }

  return renderContent()
}

export default EditorContainer
