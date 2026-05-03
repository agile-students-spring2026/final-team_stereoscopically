import { useCallback, useEffect, useState } from 'react'
import { resolveDraftMediaIds } from '../utils/draftMediaIds.js'
import { getImageDraftRestoreState, getVideoDraftRestoreState } from '../utils/draftRestoreState.js'
import { convertBackendVideoResultToLocalMedia } from '../services/backendGifService'
import { getBackendBaseUrl } from '../services/backendMediaClient'
import MediaEntry from './MediaEntry'
import CameraCapture from './CameraCapture'
import PhotoPreview from './PhotoPreview'
import EditorStatus from './EditorStatus.jsx'
import ImageEditorFlow from './image/ImageEditorFlow'
import GifEditorFlow from './gif/GifEditorFlow'
import useMediaSelection, { MEDIA_SELECTION_CODES } from '../hooks/useMediaSelection'
import useGifEditingSession from '../hooks/useGifEditingSession'
import useImageEditingSession from '../hooks/useImageEditingSession'
import { buildSuggestedDraftTitle } from '../utils/buildCreationPayload.js'

const SCREENS = {
  EDITOR: 'editor',
  CAMERA: 'camera',
  CAMERA_PREVIEW: 'camera-preview',
}

const FILE_TOO_LARGE_MESSAGE = 'File is too large (max 50 MB).'
const UNSUPPORTED_IMAGE_MESSAGE =
  'GIF and HEIC/HEIF files are not supported for image editing yet. Please upload JPG or PNG.'

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

  const [appliedTextOverlay, setAppliedTextOverlay] = useState(null)
  const [preTextWorkingMediaId, setPreTextWorkingMediaId] = useState(null)

  const imageSession = useImageEditingSession({
    mediaType,
    backendImageResult,
    previewUrl,
    sourceUrl,
    applyTransformedImage,
    appliedTextOverlay,
    preTextWorkingMediaId,
    onPreTextWorkingMediaIdChange: setPreTextWorkingMediaId,
  })

  const {
    resetImageEditingSessionState,
    clearCropSession,
    restoreImageSession,
  } = imageSession

  const [screen, setScreen] = useState(SCREENS.EDITOR)
  const [activeDraftId, setActiveDraftId] = useState(null)
  const [draftTitle, setDraftTitle] = useState(null)
  const [imageDraftSourceMediaId, setImageDraftSourceMediaId] = useState(null)
  const [videoDraftSourceMediaId, setVideoDraftSourceMediaId] = useState(null)
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
    imageDraftSourceMediaId || (mediaType === 'image' ? backendImageResult?.id : null)

  const effectiveVideoDraftSourceMediaId =
    videoDraftSourceMediaId || (mediaType === 'video' ? backendVideoResult?.id : null)

  const shouldShowDraftLoadCancel = isDraftLoading && showDraftLoadCancel

  const handleActiveDraftSaved = useCallback((id, title) => {
    if (id) setActiveDraftId(id)
    if (typeof title === 'string' && title.trim()) setDraftTitle(title.trim())
  }, [])

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
    setDraftTitle(buildSuggestedDraftTitle({ file, preset: null, kind: 'image' }))
    setImageDraftSourceMediaId(null)
    setVideoDraftSourceMediaId(null)
    setAppliedTextOverlay(null)
    setPreTextWorkingMediaId(null)

    if (result?.applied) {
      setScreen(SCREENS.EDITOR)
    }
  }

  const handleVideoSelect = useCallback(
    async (
      file,
      {
        preserveSelectedSpeed = false,
        preserveOriginalVideo = false,
        preserveDraftIdentity = false,
      } = {},
    ) => {
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
          setDraftTitle(buildSuggestedDraftTitle({ file, preset: null, kind: 'gif' }))
          setImageDraftSourceMediaId(null)
          setVideoDraftSourceMediaId(null)
        }

        if (pendingVideoDraftPayload) {
          gifSession.restoreGifSession(pendingVideoDraftPayload)
          setPendingVideoDraftPayload(null)
        } else if (!preserveDraftIdentity) {
          setActiveDraftId(null)
          setDraftTitle(buildSuggestedDraftTitle({ file, preset: null, kind: 'gif' }))
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
    setDraftTitle(null)
    setImageDraftSourceMediaId(null)
    setVideoDraftSourceMediaId(null)
    setAppliedTextOverlay(null)
    setPreTextWorkingMediaId(null)
    setShowDraftLoadCancel(false)
    setScreen(SCREENS.EDITOR)
  }

  const handleLoadDraft = useCallback(
    async (creation, options = {}) => {
      const { openAsFollowedShare = false } = options
      const payload = creation?.editorPayload
      if (!payload) return

      setDraftLoadError(null)
      setShowDraftLoadCancel(false)

      const draftId = String(creation._id ?? creation.id)
      const ownedDraftId = openAsFollowedShare ? null : draftId
      const loadedTitle =
        typeof creation?.title === 'string' && creation.title.trim() ? creation.title.trim() : null
      const { sourceMediaId, workingMediaId, resumeMediaId } = resolveDraftMediaIds(payload)

      if (payload.kind === 'image') {
        const imageRestore = getImageDraftRestoreState(payload)

        setIsDraftLoading(true)
        resetSelection()
        resetImageEditingSessionState()
        gifSession.resetGifSession()
        setPendingVideoDraftPayload(null)
        setActiveDraftId(ownedDraftId)
        setDraftTitle(
          loadedTitle ||
            buildSuggestedDraftTitle({
              file: { name: `${payload?.kind || 'draft'}.restore` },
              preset: null,
              kind: payload?.kind === 'video' ? 'gif' : 'image',
            }),
        )
        setImageDraftSourceMediaId(sourceMediaId)
        setVideoDraftSourceMediaId(null)

        const normalizedPayload = {
          ...payload,
          lastCropBoxPx: imageRestore.crop,
          colorAdjustments: imageRestore.colorAdjustments,
          selectedImageFilterPreset: imageRestore.presetFilter,
          textOverlay: imageRestore.textOverlay,
          selectedPreset: imageRestore.resize?.preset ?? payload?.selectedPreset ?? null,
          letterboxColor:
            imageRestore.resize?.letterboxColor ?? payload?.letterboxColor ?? 'transparent',
        }

        const ok = await restoreImageSession(normalizedPayload)
        setIsDraftLoading(false)

        if (ok) {
          setAppliedTextOverlay(imageRestore.textOverlay ?? null)
          setPreTextWorkingMediaId(payload.preTextWorkingMediaId ?? null)
          setScreen(SCREENS.EDITOR)
        } else {
          setDraftLoadError('Could not restore draft image. The file may have expired.')
          setActiveDraftId(null)
          setDraftTitle(null)
          setImageDraftSourceMediaId(null)
          setAppliedTextOverlay(null)
          setPreTextWorkingMediaId(null)
        }
        return
      }

      if (payload.kind === 'video') {
        const videoRestore = getVideoDraftRestoreState(payload)
        const normalizedPayload = {
          ...payload,
          trimRange: videoRestore.trimRange,
          resizePreset: videoRestore.resizePreset,
          resizeBorderColor: videoRestore.resizeBorderColor,
          selectedSpeedPlaybackRate: videoRestore.selectedSpeedPlaybackRate,
          textOverlaySettings: videoRestore.textOverlaySettings,
          selectedFilterPreset: videoRestore.selectedFilterPreset,
        }

        resetSelection()
        resetImageEditingSessionState()
        gifSession.resetGifSession()
        setActiveDraftId(ownedDraftId)
        setDraftTitle(
          loadedTitle ||
            buildSuggestedDraftTitle({
              file: { name: 'video.restore' },
              preset: null,
              kind: 'gif',
            }),
        )
        setImageDraftSourceMediaId(null)
        setVideoDraftSourceMediaId(sourceMediaId)
        setPendingVideoDraftPayload(null)

        if (!resumeMediaId) {
          setPendingVideoDraftPayload(normalizedPayload)
          return
        }

        setIsDraftLoading(true)

        try {
          setPendingVideoDraftPayload(normalizedPayload)

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
          setPendingVideoDraftPayload(normalizedPayload)
          setActiveDraftId(null)
          setDraftTitle(null)
        } finally {
          setIsDraftLoading(false)
        }

        return
      }
    },
    [gifSession, handleVideoSelect, resetImageEditingSessionState, resetSelection, restoreImageSession],
  )

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
    if (screen === SCREENS.CAMERA) return renderCameraCapture()
    if (screen === SCREENS.CAMERA_PREVIEW) return renderCameraPreview()

    return (
      <>
        {draftLoadError && <EditorStatus tone="error" spaced>{draftLoadError}</EditorStatus>}
        {renderMediaEntry()}
      </>
    )
  }

  const renderContent = () => {
    let content

    if (!selectedMedia) {
      content = renderNoSelectionFlow()
    } else if (mediaType === 'video') {
      content = (
        <GifEditorFlow
          gifSession={gifSession}
          media={{ selectedMedia, backendVideoResult }}
          originalVideoFile={originalVideoFile}
          draft={{
            activeDraftId,
            draftTitle,
            onDraftTitleChange: setDraftTitle,
            effectiveVideoDraftSourceMediaId,
            onActiveDraftSaved: handleActiveDraftSaved,
          }}
          onVideoSelect={handleVideoSelect}
          onBack={handleBackToUpload}
          onDraftSaved={onDraftSaved}
        />
      )
    } else {
      content = (
        <ImageEditorFlow
          imageSession={imageSession}
          media={{ selectedMedia, isUploading, uploadError }}
          draft={{
            activeDraftId,
            draftTitle,
            onDraftTitleChange: setDraftTitle,
            effectiveImageDraftSourceMediaId,
            onActiveDraftSaved: handleActiveDraftSaved,
          }}
          textOverlay={{
            appliedTextOverlay,
            preTextWorkingMediaId,
            onAppliedTextOverlayChange: setAppliedTextOverlay,
            onPreTextWorkingMediaIdChange: setPreTextWorkingMediaId,
          }}
          onBack={handleBackToUpload}
          onDraftSaved={onDraftSaved}
        />
      )
    }

    return (
      <div className="draft-loading-host">
        {content}

        {isDraftLoading && (
          <div className="draft-restore-overlay">
            <div className="draft-restore-banner">
              <span className="draft-restore-banner__spinner" aria-hidden="true" />
              <p className="draft-restore-banner__text">Opening draft…</p>
              {shouldShowDraftLoadCancel && (
                <button
                  type="button"
                  className="draft-restore-banner__cancel"
                  onClick={() => {
                    setPendingVideoDraftPayload(null)
                    setActiveDraftId(null)
                    setDraftTitle(null)
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