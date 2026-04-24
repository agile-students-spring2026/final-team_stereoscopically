import { useCallback, useEffect, useState } from 'react'
import { createCreation, updateCreation } from '../services/creationsApi.js'
import { buildImageCreationPayload, buildVideoCreationPayload, defaultCreationTitle } from '../utils/buildCreationPayload.js'
import { resolveDraftMediaIds } from '../utils/draftMediaIds.js'
import { getOrCreateOwnerKey } from '../utils/ownerKey.js'
import MediaEntry from './MediaEntry'
import ImageEditor from './image/ImageEditor'
import FilterMain from './FilterMain'
import PresetFilters from './image/PresetFilters'
import PresetSizes from './image/PresetSizes'
import AddText from './image/AddText'
import ColorFilters from './image/ColorFilters'
import GifEditor from './gif/GifEditor'
import useMediaSelection, { MEDIA_SELECTION_CODES } from '../hooks/useMediaSelection'
import useGifEditingSession from '../hooks/useGifEditingSession'
import useImageEditingSession from '../hooks/useImageEditingSession'
import { convertBackendVideoResultToLocalMedia } from '../services/backendGifService'
import { getBackendBaseUrl } from '../services/backendMediaClient'
import CameraCapture from './CameraCapture'
import PhotoPreview from './PhotoPreview'
import VideoPresetFilters from './gif/VideoPresetFilters'
import GifFilterMain from './gif/GifFilterMain'
import GifSpeedControls from './gif/GifSpeedControls'
import GifTrimEditor from './gif/GifTrimEditor'
import GifResizePresets from './gif/GifResizePresets'
import GifTextOverlayEditor from './gif/GifTextOverlayEditor'
import EditorStatus from './EditorStatus.jsx'

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
const UNSUPPORTED_IMAGE_MESSAGE = 'GIF and HEIC/HEIF files are not supported for image editing yet. Please upload JPG or PNG.'

function EditorContainer({ onDraftSaved, onSelectCreation }) {
  const {
    mediaType,
    selectedMedia,
    previewUrl,
    sourceUrl,
    backendImageResult,
    backendVideoResult,
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

  const gifSession = useGifEditingSession()

  const {
    letterboxColor,
    setLetterboxColor,
    isExporting,
    isResettingCrop,
    exportError,
    lastCropBoxPx,
    hasCropHistory,
    effectiveImageSrc,
    selectedPreset,
    effectiveBackendMediaId,
    colorAdjustments,
    selectedImageFilterPreset,
    resetImageEditingSessionState,
    presetFilterPreviewSrc,
    isLoadingPresetFilterPreview,
    presetFilterError,
    colorFilterPreviewSrc,
    isLoadingColorFilterPreview,
    colorFilterError,
    clearCropSession,
    handleSizeSelect,
    handleCropApply,
    resetCropToOriginal,
    handleAddTextApply,
    handleExport,
    selectImageFilterPreset,
    applyImagePresetFilter,
    updateColorAdjustments,
    applyColorAdjustments,
    restoreImageSession,
    editBaseMediaId,
  } = useImageEditingSession({
    mediaType,
    backendImageResult,
    previewUrl,
    sourceUrl,
    applyTransformedImage,
  })

  const [screen, setScreen] = useState(SCREENS.EDITOR)
  const [activeDraftId, setActiveDraftId] = useState(null)
  const [activeDraftTitle, setActiveDraftTitle] = useState(null)
  const [imageDraftSourceMediaId, setImageDraftSourceMediaId] = useState(null)
  const [videoDraftSourceMediaId, setVideoDraftSourceMediaId] = useState(null)
  const [appliedTextOverlay, setAppliedTextOverlay] = useState(null)
  const [preTextWorkingMediaId, setPreTextWorkingMediaId] = useState(null)
  const [saveForLaterError, setSaveForLaterError] = useState(null)
  const [saveForLaterMessage, setSaveForLaterMessage] = useState(null)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [fileTooLargeMessage, setFileTooLargeMessage] = useState(null)
  const [unsupportedImageMessage, setUnsupportedImageMessage] = useState(null)
  const [lastRejectedUploadType, setLastRejectedUploadType] = useState(null)
  const [tempCapturedFile, setTempCapturedFile] = useState(null)
  const [originalVideoFile, setOriginalVideoFile] = useState(null)
  const [isDraftLoading, setIsDraftLoading] = useState(false)
  const [draftLoadError, setDraftLoadError] = useState(null)
  const [pendingVideoDraftPayload, setPendingVideoDraftPayload] = useState(null)
  const [showDraftLoadCancel, setShowDraftLoadCancel] = useState(false)
  const [unsupportedVideo, setUnsupportedVideo] = useState(null)

  const effectiveImageDraftSourceMediaId =
    imageDraftSourceMediaId ||
    (mediaType === 'image' ? backendImageResult?.id : null)

  const effectiveVideoDraftSourceMediaId =
    videoDraftSourceMediaId ||
    (mediaType === 'video' ? backendVideoResult?.id : null)

  const shouldShowDraftLoadCancel = isDraftLoading && showDraftLoadCancel

  const handleImageSelect = async (file) => {
    if (!file) return

    setOriginalVideoFile(null)
    setLastRejectedUploadType('image')

    const result = await selectImage(file)

    if (result?.code === MEDIA_SELECTION_CODES.UNSUPPORTED_IMAGE) {
      setUnsupportedImageMessage(UNSUPPORTED_IMAGE_MESSAGE)
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
    setActiveDraftId(null)
    setActiveDraftTitle(null)
    setImageDraftSourceMediaId(null)
    setVideoDraftSourceMediaId(null)
    setSaveForLaterError(null)
    setSaveForLaterMessage(null)
    setAppliedTextOverlay(null)
    setPreTextWorkingMediaId(null)

    if (result?.applied) {
      setScreen(SCREENS.EDITOR)
    }
  }

  const handleVideoSelect = useCallback(
    async (file, { preserveSelectedSpeed = false, preserveOriginalVideo = false, preserveDraftIdentity = false } = {}) => {
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

      if (!preserveOriginalVideo) {
        setOriginalVideoFile(file)
      }

      setFileTooLargeMessage(null)
      setUnsupportedVideo(null)
      clearCropSession()

      if (result?.applied) {
        if (!preserveDraftIdentity) {
          setActiveDraftId(null)
          setActiveDraftTitle(null)
          setImageDraftSourceMediaId(null)
          setVideoDraftSourceMediaId(null)
        }
        setSaveForLaterError(null)
        setSaveForLaterMessage(null)

        if (pendingVideoDraftPayload) {
          gifSession.restoreGifSession(pendingVideoDraftPayload)
          setPendingVideoDraftPayload(null)
        } else if (!preserveDraftIdentity) {
          setActiveDraftId(null)
          setActiveDraftTitle(null)
          gifSession.resetGifSession({ preserveSelectedSpeed })
        }

        setScreen(SCREENS.EDITOR)
      }

      return result
    },
    [clearCropSession, gifSession, pendingVideoDraftPayload, selectVideo],
  )

  const handleCameraSelect = () => {
    setScreen(SCREENS.CAMERA)
  }

  const handleBackToUpload = () => {
    setOriginalVideoFile(null)
    resetSelection()
    resetImageEditingSessionState()
    gifSession.resetGifSession()
    setPendingVideoDraftPayload(null)
    setActiveDraftId(null)
    setActiveDraftTitle(null)
    setImageDraftSourceMediaId(null)
    setVideoDraftSourceMediaId(null)
    setSaveForLaterError(null)
    setSaveForLaterMessage(null)
    setAppliedTextOverlay(null)
    setPreTextWorkingMediaId(null)
    setShowDraftLoadCancel(false)
    setScreen(SCREENS.EDITOR)
  }

  const handleLoadDraft = useCallback(async (creation) => {
    const payload = creation?.editorPayload
    if (!payload) return

    setDraftLoadError(null)
    setShowDraftLoadCancel(false)

    const draftId = String(creation._id ?? creation.id)
    const nextDraftTitle = typeof creation?.title === 'string' && creation.title.trim()
      ? creation.title.trim()
      : null
    const { sourceMediaId, workingMediaId, resumeMediaId } = resolveDraftMediaIds(payload)

    if (payload.kind === 'image') {
      setIsDraftLoading(true)
      resetSelection()
      resetImageEditingSessionState()
      gifSession.resetGifSession()
      setPendingVideoDraftPayload(null)
      setActiveDraftId(draftId)
      setActiveDraftTitle(nextDraftTitle)
      setImageDraftSourceMediaId(sourceMediaId)
      setVideoDraftSourceMediaId(null)
      setSaveForLaterError(null)
      setSaveForLaterMessage(null)

      const ok = await restoreImageSession(payload)
      setIsDraftLoading(false)

      if (ok) {
        setAppliedTextOverlay(payload.textOverlay ?? null)
        setPreTextWorkingMediaId(payload.preTextWorkingMediaId ?? null)
        setScreen(SCREENS.EDITOR)
      } else {
        setDraftLoadError('Could not restore draft image. The file may have expired.')
        setActiveDraftId(null)
        setActiveDraftTitle(null)
        setImageDraftSourceMediaId(null)
        setAppliedTextOverlay(null)
        setPreTextWorkingMediaId(null)
      }
      return
    }

    if (payload.kind === 'video') {
      resetSelection()
      resetImageEditingSessionState()
      gifSession.resetGifSession()
      setActiveDraftId(draftId)
      setActiveDraftTitle(nextDraftTitle)
      setImageDraftSourceMediaId(null)
      setVideoDraftSourceMediaId(sourceMediaId)
      setSaveForLaterError(null)
      setSaveForLaterMessage(null)
      setPendingVideoDraftPayload(null)

      if (!resumeMediaId) {
        setPendingVideoDraftPayload(payload)
        return
      }

      setIsDraftLoading(true)

      try {
        setPendingVideoDraftPayload(payload)

        const candidateIds = [...new Set([workingMediaId, sourceMediaId].filter(Boolean))]
        let restoredFile = null

        for (const mediaId of candidateIds) {
          try {
            const restoredResult = {
              id: mediaId,
              url: `${getBackendBaseUrl()}/api/media/${mediaId}`,
              mimeType: 'video/mp4',
            }

            const converted = await convertBackendVideoResultToLocalMedia(restoredResult, {
              fallbackFileName: 'draft-video.mp4',
              fallbackMimeType: 'video/mp4',
              fetchErrorMessage: 'Failed to load draft video.',
            })

            restoredFile = converted.file
            break
          } catch {
            // Try next candidate id.
          }
        }

        if (!restoredFile) {
          throw new Error('Draft video could not be restored.')
        }

        const selection = await handleVideoSelect(restoredFile, {
          preserveSelectedSpeed: true,
          preserveOriginalVideo: false,
          preserveDraftIdentity: true,
        })

        if (selection?.code !== MEDIA_SELECTION_CODES.OK) {
          throw new Error('Draft video could not be restored.')
        }

        if (sourceMediaId && workingMediaId && sourceMediaId !== workingMediaId) {
          try {
            const sourceResult = {
              id: sourceMediaId,
              url: `${getBackendBaseUrl()}/api/media/${sourceMediaId}`,
              mimeType: 'video/mp4',
            }
            const { file: sourceFile } = await convertBackendVideoResultToLocalMedia(sourceResult, {
              fallbackFileName: 'source-video.mp4',
              fallbackMimeType: 'video/mp4',
              fetchErrorMessage: 'Failed to load source video.',
            })
            setOriginalVideoFile(sourceFile)
          } catch {
            // Non-critical. originalVideoFile stays as the working video.
          }
        }

        setIsDraftLoading(false)
        setScreen(SCREENS.EDITOR)
      } catch {
        setDraftLoadError('Could not restore draft video. The file may have expired.')
        setPendingVideoDraftPayload(payload)
        setActiveDraftId(null)
        setActiveDraftTitle(null)
      } finally {
        setIsDraftLoading(false)
      }

      return
    }
  }, [gifSession, handleVideoSelect, resetImageEditingSessionState, resetSelection, restoreImageSession])

  useEffect(() => {
    onSelectCreation?.(handleLoadDraft)
  }, [handleLoadDraft, onSelectCreation])

  useEffect(() => {
    if (!isDraftLoading) return undefined

    const timer = window.setTimeout(() => {
      setShowDraftLoadCancel(true)
    }, 2200)

    return () => window.clearTimeout(timer)
  }, [isDraftLoading])

  const handleSaveForLaterImage = useCallback(async () => {
    if (!selectedMedia) return

    setSaveForLaterError(null)
    setSaveForLaterMessage(null)
    setIsSavingDraft(true)

    try {
      const title = activeDraftTitle || defaultCreationTitle(selectedMedia)
      const editorPayload = buildImageCreationPayload({
        sourceMediaId: effectiveImageDraftSourceMediaId || effectiveBackendMediaId,
        workingMediaId: effectiveBackendMediaId || effectiveImageDraftSourceMediaId,
        preEditWorkingMediaId: editBaseMediaId || null,
        preTextWorkingMediaId: preTextWorkingMediaId || null,
        textOverlay: appliedTextOverlay || null,
        lastCropBoxPx,
        colorAdjustments,
        selectedImageFilterPreset,
        selectedPreset,
        letterboxColor,
      })

      const body = { title, editorPayload, status: 'draft' }
      const result = activeDraftId
        ? await updateCreation(activeDraftId, body)
        : await createCreation({ ...body, ownerKey: getOrCreateOwnerKey() })

      const id = result?._id ?? result?.id
      if (id) {
        setActiveDraftId(String(id))
      }
      setActiveDraftTitle(title)

      setSaveForLaterMessage('Draft saved. View it in My Creations.')
      onDraftSaved?.()
    } catch (err) {
      setSaveForLaterError(err?.message || 'Could not save draft.')
    } finally {
      setIsSavingDraft(false)
    }
  }, [
    activeDraftId,
    activeDraftTitle,
    appliedTextOverlay,
    colorAdjustments,
    editBaseMediaId,
    effectiveBackendMediaId,
    effectiveImageDraftSourceMediaId,
    lastCropBoxPx,
    letterboxColor,
    onDraftSaved,
    preTextWorkingMediaId,
    selectedImageFilterPreset,
    selectedMedia,
    selectedPreset,
  ])

  const handleSaveForLaterVideo = useCallback(async () => {
    if (!selectedMedia) return

    setSaveForLaterError(null)
    setSaveForLaterMessage(null)
    setIsSavingDraft(true)

    const sourceMediaId = effectiveVideoDraftSourceMediaId || null
    const workingMediaId = backendVideoResult?.id || sourceMediaId

    if (!workingMediaId) {
      setSaveForLaterError('Video is not uploaded to the backend yet. Please wait and try saving again.')
      setIsSavingDraft(false)
      return
    }

    try {
      const title = activeDraftTitle || defaultCreationTitle(selectedMedia)
      const editorPayload = buildVideoCreationPayload({
        sourceMediaId,
        workingMediaId,
        trimRange: gifSession.trimRange,
        resizePreset: gifSession.resizePreset,
        resizeBorderColor: gifSession.resizeBorderColor,
        selectedSpeedPlaybackRate: gifSession.selectedSpeedPlaybackRate,
        textOverlaySettings: gifSession.textOverlaySettings,
        selectedFilterPreset: gifSession.selectedFilterPreset,
      })

      const body = { title, editorPayload, status: 'draft' }
      const result = activeDraftId
        ? await updateCreation(activeDraftId, body)
        : await createCreation({ ...body, ownerKey: getOrCreateOwnerKey() })

      const id = result?._id ?? result?.id
      if (id) {
        setActiveDraftId(String(id))
      }
      setActiveDraftTitle(title)

      setSaveForLaterMessage('Draft saved. View it in My Creations.')
      onDraftSaved?.()
    } catch (err) {
      setSaveForLaterError(err?.message || 'Could not save draft.')
    } finally {
      setIsSavingDraft(false)
    }
  }, [
    activeDraftId,
    activeDraftTitle,
    backendVideoResult?.id,
    effectiveVideoDraftSourceMediaId,
    gifSession.resizeBorderColor,
    gifSession.resizePreset,
    gifSession.selectedFilterPreset,
    gifSession.selectedSpeedPlaybackRate,
    gifSession.textOverlaySettings,
    gifSession.trimRange,
    onDraftSaved,
    selectedMedia,
  ])

  const handleOpenFilters = () => {
    setScreen(SCREENS.FILTERS_MAIN)
  }

  const handleOpenSizes = () => {
    setScreen(SCREENS.PRESET_SIZES)
  }

  const handleVideoPresetApply = useCallback(
    async (result) => {
      if (!result?.url) {
        if (originalVideoFile) {
          await handleVideoSelect(originalVideoFile, {
            preserveSelectedSpeed: true,
            preserveOriginalVideo: true,
          })
        }

        gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.EDITOR)
        setScreen(SCREENS.EDITOR)
        return
      }

      const { file: filteredFile } = await convertBackendVideoResultToLocalMedia(result, {
        fallbackFileName: `filtered-${result?.preset || 'video'}.mp4`,
        fallbackMimeType: 'video/mp4',
        fetchErrorMessage: 'Failed to load filtered video.',
      })

      const selection = await handleVideoSelect(filteredFile, {
        preserveSelectedSpeed: true,
        preserveOriginalVideo: true,
        preserveDraftIdentity: true,
      })

      if (selection?.code !== MEDIA_SELECTION_CODES.OK) {
        throw new Error('Filtered video could not be loaded in editor.')
      }
    },
    [handleVideoSelect, gifSession, originalVideoFile],
  )

  const handleGifTrimApply = useCallback((nextRange) => {
    gifSession.applyTrimRange(nextRange)
  }, [gifSession])

  const handleGifResizeApply = useCallback((nextResizeSettings) => {
    gifSession.applyResizeSettings(nextResizeSettings)
  }, [gifSession])

  const handleCropApplyWrapped = useCallback(async (cropRequest) => {
    const result = await handleCropApply(cropRequest)
    setAppliedTextOverlay(null)
    setPreTextWorkingMediaId(null)
    return result
  }, [handleCropApply])

  const handlePresetSizeApply = async ({ preset, letterboxColor: nextLetterboxColor }) => {
    const applied = await handleSizeSelect(preset, {
      letterboxColor: nextLetterboxColor,
    })

    if (!applied) {
      return
    }

    setLetterboxColor(nextLetterboxColor)
    setScreen(SCREENS.EDITOR)
  }

  const handleAddTextScreenApply = async (textRequest) => {
    const baseForText = preTextWorkingMediaId || effectiveBackendMediaId
    if (!preTextWorkingMediaId && effectiveBackendMediaId) {
      setPreTextWorkingMediaId(effectiveBackendMediaId)
    }

    const applied = await handleAddTextApply({
      ...textRequest,
      _overrideBaseMediaId: baseForText || undefined,
    })

    if (applied) {
      setAppliedTextOverlay({
        text: textRequest?.text ?? '',
        font: textRequest?.font || textRequest?.fontFamily || 'Arial',
        color: textRequest?.color || '#111111',
        fontSize: textRequest?.fontSize ?? null,
        x: textRequest?.x ?? 0.5,
        y: textRequest?.y ?? 0.5,
      })
      setScreen(SCREENS.EDITOR)
    }
  }

  const renderImageEditor = () => (
    <ImageEditor
      imageSrc={effectiveImageSrc}
      cropSourceImageSrc={effectiveImageSrc}
      initialCropPx={lastCropBoxPx}
      onCropApply={handleCropApplyWrapped}
      onResetCrop={resetCropToOriginal}
      isUploading={isUploading}
      isExporting={isExporting}
      isResettingCrop={isResettingCrop}
      uploadError={uploadError}
      exportError={exportError}
      onBack={handleBackToUpload}
      onOpenFilters={handleOpenFilters}
      onSize={handleOpenSizes}
      onExport={handleExport}
      onSaveForLater={handleSaveForLaterImage}
      isSavingDraft={isSavingDraft}
      saveDraftError={saveForLaterError}
      saveDraftMessage={saveForLaterMessage}
      showResetCrop={hasCropHistory}
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

    return (
      <>
        {draftLoadError && (
          <EditorStatus tone="error" spaced>{draftLoadError}</EditorStatus>
        )}
        {renderMediaEntry()}
      </>
    )
  }

  const renderVideoFlow = () => {
    const videoKey = selectedMedia
      ? `${selectedMedia.name ?? selectedMedia.id ?? 'video'}-${selectedMedia.lastModified ?? ''}-${selectedMedia.size ?? ''}`
      : 'video'

    return (
      <GifEditor
        key={videoKey}
        videoFile={selectedMedia}
        gifSessionState={{
          trimRange: gifSession.trimRange,
          resizePreset: gifSession.resizePreset,
          resizeBorderColor: gifSession.resizeBorderColor,
          selectedSpeedPlaybackRate: gifSession.selectedSpeedPlaybackRate,
          textOverlaySettings: gifSession.textOverlaySettings,
        }}
        onCancel={handleBackToUpload}
        onCreateGif={(videoFile, trimOverrides) => gifSession.createAndExportGif(videoFile, trimOverrides)}
        onOpenTrim={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.TRIM)}
        onOpenResize={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.RESIZE)}
        onOpenFilters={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.FILTERS_MAIN)}
        onSaveForLater={handleSaveForLaterVideo}
        isSavingDraft={isSavingDraft}
        saveDraftError={saveForLaterError}
        saveDraftMessage={saveForLaterMessage}
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
            onText={() => setScreen(SCREENS.ADD_TEXT)}
            onColorFilters={() => setScreen(SCREENS.COLOR_FILTERS)}
            onCancel={() => setScreen(SCREENS.EDITOR)}
          />
        )
      case SCREENS.IMAGE_PRESET_FILTERS:
        return (
          <PresetFilters
            imageSrc={effectiveImageSrc}
            selectedStyle={selectedImageFilterPreset}
            previewSrc={presetFilterPreviewSrc}
            onSelectStyle={selectImageFilterPreset}
            onApply={async () => {
              const applied = await applyImagePresetFilter()
              if (applied) setScreen(SCREENS.EDITOR)
            }}
            onCancel={() => setScreen(SCREENS.FILTERS_MAIN)}
            applyError={exportError}
            previewError={presetFilterError}
            isLoadingPreview={isLoadingPresetFilterPreview}
          />
        )
      case SCREENS.ADD_TEXT: {
        const preTextImageSrc = preTextWorkingMediaId
          ? `${getBackendBaseUrl()}/api/media/${encodeURIComponent(preTextWorkingMediaId)}`
          : effectiveImageSrc

        const initialUiFontSize = appliedTextOverlay?.fontSize
          ? Math.max(2, Math.round(appliedTextOverlay.fontSize / 5))
          : undefined

        return (
          <AddText
            imageSrc={preTextImageSrc}
            initialText={appliedTextOverlay?.text ?? undefined}
            initialFont={appliedTextOverlay?.font ?? undefined}
            initialTextColor={appliedTextOverlay?.color ?? undefined}
            initialFontSize={initialUiFontSize}
            initialPlacement={appliedTextOverlay ? { x: appliedTextOverlay.x, y: appliedTextOverlay.y } : undefined}
            onApply={handleAddTextScreenApply}
            onBack={() => setScreen(SCREENS.FILTERS_MAIN)}
            onCancel={() => setScreen(SCREENS.EDITOR)}
            applyError={exportError}
          />
        )
      }
      case SCREENS.COLOR_FILTERS:
        return (
          <ColorFilters
            imageSrc={effectiveImageSrc}
            adjustments={colorAdjustments}
            previewSrc={colorFilterPreviewSrc}
            onAdjustmentsChange={updateColorAdjustments}
            onApply={async () => {
              const applied = await applyColorAdjustments()
              if (applied) setScreen(SCREENS.EDITOR)
            }}
            onCancel={() => setScreen(SCREENS.EDITOR)}
            applyError={exportError}
            previewError={colorFilterError}
            isLoadingPreview={isLoadingColorFilterPreview}
          />
        )
      case SCREENS.PRESET_SIZES:
        return (
          <PresetSizes
            imageSrc={effectiveImageSrc}
            initialPreset={selectedPreset}
            initialLetterboxColor={letterboxColor}
            onApply={handlePresetSizeApply}
            onCancel={() => setScreen(SCREENS.EDITOR)}
            isBusy={isExporting}
          />
        )
      default:
        return renderImageEditor()
    }
  }

  const renderContent = () => {
    let content

    if (!selectedMedia) {
      content = renderNoSelectionFlow()
    } else if (mediaType === 'video') {
      if (gifSession.activeTool === gifSession.GIF_FLOW_TOOLS.FILTERS_MAIN) {
        content = (
          <GifFilterMain
            onPresetFilters={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.PRESET_FILTERS)}
            onTextOverlay={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.TEXT)}
            onSpeed={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.SPEED)}
            onCancel={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.EDITOR)}
          />
        )
      } else if (gifSession.activeTool === gifSession.GIF_FLOW_TOOLS.PRESET_FILTERS) {
        const sourceVideoForFilters = originalVideoFile || selectedMedia

        content = (
          <VideoPresetFilters
            videoFile={sourceVideoForFilters}
            selectedFilter={gifSession.selectedFilterPreset}
            onSelectFilter={(presetId) => gifSession.selectFilterPreset(sourceVideoForFilters, presetId)}
            onApply={async () => {
              if (gifSession.selectedFilterPreset === 'default') {
                await gifSession.selectFilterPreset(sourceVideoForFilters, 'default')
                await handleVideoPresetApply(null)
                return
              }

              const preset = gifSession.selectedFilterPreset
              const existingResult = gifSession.filterPreviewResult

              try {
                const result =
                  existingResult?.preset === preset && existingResult?.url
                    ? existingResult
                    : await gifSession.applyVideoFilterAndReturn(sourceVideoForFilters, preset, existingResult)

                await handleVideoPresetApply(result)
              } catch {
                // Errors are already surfaced elsewhere.
              }
            }}
            onCancel={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.FILTERS_MAIN)}
            isLoadingPreview={gifSession.isLoadingFilterPreview}
            previewError={gifSession.filterPreviewError}
            previewUrl={gifSession.filterPreviewUrl}
          />
        )
      } else if (gifSession.activeTool === gifSession.GIF_FLOW_TOOLS.TEXT) {
        content = (
          <GifTextOverlayEditor
            videoFile={selectedMedia}
            initialSettings={gifSession.textOverlaySettings}
            onChange={gifSession.updateGifTextOverlaySettings}
            onApply={gifSession.applyGifTextOverlaySettings}
            onBack={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.FILTERS_MAIN)}
            onCancel={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.EDITOR)}
          />
        )
      } else if (gifSession.activeTool === gifSession.GIF_FLOW_TOOLS.SPEED) {
        content = (
          <GifSpeedControls
            videoFile={selectedMedia}
            selectedSpeedPlaybackRate={gifSession.selectedSpeedPlaybackRate}
            onSelectSpeed={gifSession.selectSpeed}
            onApplySpeed={gifSession.applySpeed}
            onBack={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.FILTERS_MAIN)}
            onCancel={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.EDITOR)}
          />
        )
      } else if (gifSession.activeTool === gifSession.GIF_FLOW_TOOLS.RESIZE) {
        content = (
          <GifResizePresets
            initialPreset={gifSession.resizePreset}
            initialBorderColor={gifSession.resizeBorderColor}
            videoFile={selectedMedia}
            onApply={handleGifResizeApply}
            onCancel={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.EDITOR)}
          />
        )
      } else if (gifSession.activeTool === gifSession.GIF_FLOW_TOOLS.TRIM) {
        content = (
          <GifTrimEditor
            videoFile={selectedMedia}
            initialTrimStart={gifSession.trimRange.start}
            initialTrimEnd={gifSession.trimRange.end}
            onApply={handleGifTrimApply}
            onCancel={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.EDITOR)}
          />
        )
      } else {
        content = renderVideoFlow()
      }
    } else {
      content = renderImageFlow()
    }

    return (
      <div className="draft-loading-host">
        {content}

        {isDraftLoading && (
          <div className="draft-restore-overlay">
            <div className="draft-restore-banner">
              <span className="draft-restore-banner__spinner" aria-hidden="true" />
              <p className="draft-restore-banner__text">
                Opening draft…
              </p>
              {shouldShowDraftLoadCancel && (
                <button
                  type="button"
                  className="draft-restore-banner__cancel"
                  onClick={() => {
                    setPendingVideoDraftPayload(null)
                    setActiveDraftId(null)
                    setActiveDraftTitle(null)
                    setIsDraftLoading(false)
                    setShowDraftLoadCancel(false)
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return renderContent()
}

export default EditorContainer