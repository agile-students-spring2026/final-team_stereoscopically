import { useState, useCallback } from 'react'
import { createCreation, updateCreation } from '../../services/creationsApi.js'
import {
  buildVideoCreationPayload,
  buildSuggestedDraftTitle,
} from '../../utils/buildCreationPayload.js'
import { getOrCreateOwnerKey } from '../../utils/ownerKey.js'
import { convertBackendVideoResultToLocalMedia } from '../../services/backendGifService'
import { MEDIA_SELECTION_CODES } from '../../hooks/useMediaSelection'
import GifEditor from './GifEditor'
import GifFilterMain from './GifFilterMain'
import VideoPresetFilters from './VideoPresetFilters'
import GifSpeedControls from './GifSpeedControls'
import GifTrimEditor from './GifTrimEditor'
import GifResizePresets from './GifResizePresets'
import GifTextOverlayEditor from './GifTextOverlayEditor'
import SaveDraftModal from '../SaveDraftModal'

function GifEditorFlow({ gifSession, media, originalVideoFile, draft, onVideoSelect, onBack, onDraftSaved }) {
  const { selectedMedia, backendVideoResult } = media
  const {
    activeDraftId,
    draftTitle,
    onDraftTitleChange,
    effectiveVideoDraftSourceMediaId,
    onActiveDraftSaved,
  } = draft

  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [saveForLaterError, setSaveForLaterError] = useState(null)
  const [saveForLaterMessage, setSaveForLaterMessage] = useState(null)
  const [showSaveDraftModal, setShowSaveDraftModal] = useState(false)

  const handleGifTrimApply = useCallback(
    (nextRange) => {
      gifSession.applyTrimRange(nextRange)
    },
    [gifSession],
  )

  const handleGifResizeApply = useCallback(
    (nextResizeSettings) => {
      gifSession.applyResizeSettings(nextResizeSettings)
    },
    [gifSession],
  )

  const guestOwnership = useCallback(() => ({ guestOwnerKey: getOrCreateOwnerKey() }), [])

  // ...existing code...

  const resolveGifDraftTitle = useCallback(
    (file) => {
      const f = file ?? selectedMedia
      const trimmed = typeof draftTitle === 'string' ? draftTitle.trim() : ''
      return (
        trimmed ||
        buildSuggestedDraftTitle({
          file: f,
          preset: gifSession.resizePreset ?? 'custom',
          kind: 'gif',
        })
      )
    },
    [draftTitle, gifSession.resizePreset, selectedMedia],
  )

  const handleVideoPresetApply = useCallback(
    async (result) => {
      if (!result?.url) {
        if (originalVideoFile) {
          await onVideoSelect(originalVideoFile, {
            preserveSelectedSpeed: true,
            preserveOriginalVideo: true,
          })
        }
        gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.EDITOR)
        return
      }

      const { file: filteredFile } = await convertBackendVideoResultToLocalMedia(result, {
        fallbackFileName: `filtered-${result?.preset || 'video'}.mp4`,
        fallbackMimeType: 'video/mp4',
        fetchErrorMessage: 'Failed to load filtered video.',
      })

      const selection = await onVideoSelect(filteredFile, {
        preserveSelectedSpeed: true,
        preserveOriginalVideo: true,
        preserveDraftIdentity: true,
      })

      if (selection?.code !== MEDIA_SELECTION_CODES.OK) {
        throw new Error('Filtered video could not be loaded in editor.')
      }

      gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.EDITOR)
    },
    [gifSession, onVideoSelect, originalVideoFile],
  )

  const handleSaveForLaterVideo = useCallback(async (titleOverride) => {
    if (!selectedMedia) return false

    setSaveForLaterError(null)
    setSaveForLaterMessage(null)
    setIsSavingDraft(true)

    const sourceMediaId = effectiveVideoDraftSourceMediaId || null
    const workingMediaId = backendVideoResult?.id || sourceMediaId

    if (!workingMediaId) {
      setSaveForLaterError(
        'Video is not uploaded to the backend yet. Please wait and try saving again.',
      )
      setIsSavingDraft(false)
      return false
    }

    try {
      const title = typeof titleOverride === 'string' && titleOverride.trim()
        ? titleOverride.trim()
        : resolveGifDraftTitle()

      const editorPayload = buildVideoCreationPayload({
        sourceMediaId,
        workingMediaId,
        previewMediaId: workingMediaId,
        previewPosterMediaId: backendVideoResult?.posterId ?? null,
        trimRange: gifSession.trimRange,
        resizePreset: gifSession.resizePreset,
        resizeBorderColor: gifSession.resizeBorderColor,
        selectedSpeedPlaybackRate: gifSession.selectedSpeedPlaybackRate,
        textOverlaySettings: gifSession.textOverlaySettings,
        selectedFilterPreset: gifSession.selectedFilterPreset,
      })

      const body = { title, editorPayload, status: 'draft' }
      const result = activeDraftId
        ? await updateCreation(activeDraftId, body, guestOwnership())
        : await createCreation(body, guestOwnership())

      const id = result?._id ?? result?.id
      onActiveDraftSaved(id ? String(id) : activeDraftId, title)

      setSaveForLaterMessage('Draft saved. View it in My Creations.')
      onDraftSaved?.()
      return true
    } catch (err) {
      setSaveForLaterError(err?.message || 'Could not save draft.')
      return false
    } finally {
      setIsSavingDraft(false)
    }
    }, [
    activeDraftId,
    resolveGifDraftTitle,
    guestOwnership,
    backendVideoResult?.id,
    effectiveVideoDraftSourceMediaId,
    gifSession,
    onActiveDraftSaved,
    onDraftSaved,
    selectedMedia,
  ])

  const handleSaveDraftModalConfirm = useCallback(async (name) => {
    const trimmedName = name?.trim() || ''
    if (trimmedName) onDraftTitleChange?.(trimmedName)
    const ok = await handleSaveForLaterVideo(trimmedName || undefined)
    if (ok) setShowSaveDraftModal(false)
  }, [handleSaveForLaterVideo, onDraftTitleChange])

  const handleOpenSaveDraftModal = useCallback(() => {
    setSaveForLaterError(null)
    setShowSaveDraftModal(true)
  }, [])

  const handleExportGifAndPersist = useCallback(
    async (videoFile, trimOverrides) => {
      if (
        !window.confirm(
          'Export GIF uses your Trim range, Resize frame (square / landscape / portrait), and any text overlay. Please confirm you have finished Trim and Resize as you want. Continue?',
        )
      ) {
        return
      }
      const defaultTitle = resolveGifDraftTitle(videoFile)
      const entered = window.prompt('Name this GIF (shown in My Creations)', defaultTitle)
      if (entered === null) return
      const exportTitle = entered.trim() || defaultTitle
      if (!exportTitle.trim()) {
        window.alert('Please enter a name.')
        return
      }
      onDraftTitleChange?.(exportTitle)

      const exported = await gifSession.createAndExportGif(videoFile, trimOverrides)
      if (!exported?.id) return
      const sourceMediaId = effectiveVideoDraftSourceMediaId || null
      const workingMediaId = backendVideoResult?.id || sourceMediaId
      if (!workingMediaId) return
      try {
        const title = exportTitle
        const editorPayload = buildVideoCreationPayload({
          sourceMediaId,
          workingMediaId,
          previewMediaId: workingMediaId,
          previewPosterMediaId: backendVideoResult?.posterId ?? null,
          trimRange: gifSession.trimRange,
          resizePreset: gifSession.resizePreset,
          resizeBorderColor: gifSession.resizeBorderColor,
          selectedSpeedPlaybackRate: gifSession.selectedSpeedPlaybackRate,
          textOverlaySettings: gifSession.textOverlaySettings,
          selectedFilterPreset: gifSession.selectedFilterPreset,
        })
        if (activeDraftId) {
          await updateCreation(
            activeDraftId,
            {
              status: 'exported',
              exportAssetId: exported.id,
            },
            guestOwnership(),
          )
        } else {
          const result = await createCreation(
            {
              title,
              editorPayload,
              status: 'exported',
              exportAssetId: exported.id,
            },
            guestOwnership(),
          )
          const id = result?._id ?? result?.id
          if (id) {
            onActiveDraftSaved(String(id), title)
          }
        }
        onDraftSaved?.()
      } catch (err) {
        console.warn('Could not persist GIF export:', err)
      }
    },
    [
      activeDraftId,
      resolveGifDraftTitle,
      guestOwnership,
      backendVideoResult?.id,
      effectiveVideoDraftSourceMediaId,
      gifSession,
      onActiveDraftSaved,
      onDraftSaved,
      onDraftTitleChange,
    ],
  )

  const modal = showSaveDraftModal ? (
    <SaveDraftModal
      currentTitle={draftTitle || resolveGifDraftTitle()}
      onConfirm={handleSaveDraftModalConfirm}
      onCancel={() => { if (!isSavingDraft) setShowSaveDraftModal(false) }}
      isSaving={isSavingDraft}
      saveError={saveForLaterError}
    />
  ) : null

  const videoKey = selectedMedia
    ? `${selectedMedia.name ?? selectedMedia.id ?? 'video'}-${selectedMedia.lastModified ?? ''}-${selectedMedia.size ?? ''}`
    : 'video'

  if (gifSession.activeTool === gifSession.GIF_FLOW_TOOLS.FILTERS_MAIN) {
    return (
      <>
        <GifFilterMain
          onPresetFilters={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.PRESET_FILTERS)}
          onTextOverlay={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.TEXT)}
          onSpeed={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.SPEED)}
          onCancel={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.EDITOR)}
        />
        {modal}
      </>
    )
  }

  if (gifSession.activeTool === gifSession.GIF_FLOW_TOOLS.PRESET_FILTERS) {
    const sourceVideoForFilters = originalVideoFile || selectedMedia

    return (
      <>
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
                  : await gifSession.applyVideoFilterAndReturn(
                      sourceVideoForFilters,
                      preset,
                      existingResult,
                    )

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
        {modal}
      </>
    )
  }

  if (gifSession.activeTool === gifSession.GIF_FLOW_TOOLS.TEXT) {
    return (
      <>
        <GifTextOverlayEditor
          videoFile={selectedMedia}
          initialSettings={gifSession.textOverlaySettings}
          resizePreset={gifSession.resizePreset}
          onCommitDraft={gifSession.commitGifTextOverlaySettings}
          onDraftSessionSync={gifSession.commitGifTextOverlaySettings}
          onApply={gifSession.applyGifTextOverlaySettings}
          onBack={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.FILTERS_MAIN)}
          onCancel={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.EDITOR)}
        />
        {modal}
      </>
    )
  }

  if (gifSession.activeTool === gifSession.GIF_FLOW_TOOLS.SPEED) {
    return (
      <>
        <GifSpeedControls
          videoFile={selectedMedia}
          selectedSpeedPlaybackRate={gifSession.selectedSpeedPlaybackRate}
          onSelectSpeed={gifSession.selectSpeed}
          onApplySpeed={gifSession.applySpeed}
          onBack={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.FILTERS_MAIN)}
          onCancel={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.EDITOR)}
        />
        {modal}
      </>
    )
  }

  if (gifSession.activeTool === gifSession.GIF_FLOW_TOOLS.RESIZE) {
    return (
      <>
        <GifResizePresets
          initialPreset={gifSession.resizePreset}
          initialBorderColor={gifSession.resizeBorderColor}
          videoFile={selectedMedia}
          onApply={handleGifResizeApply}
          onCancel={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.EDITOR)}
        />
        {modal}
      </>
    )
  }

  if (gifSession.activeTool === gifSession.GIF_FLOW_TOOLS.TRIM) {
    return (
      <>
        <GifTrimEditor
          videoFile={selectedMedia}
          initialTrimStart={gifSession.trimRange.start}
          initialTrimEnd={gifSession.trimRange.end}
          onApply={handleGifTrimApply}
          onCancel={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.EDITOR)}
        />
        {modal}
      </>
    )
  }

  return (
    <>
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
        onCancel={onBack}
        onCreateGif={handleExportGifAndPersist}
        onOpenTrim={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.TRIM)}
        onOpenResize={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.RESIZE)}
        onOpenFilters={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.FILTERS_MAIN)}
        onSaveForLater={handleOpenSaveDraftModal}
        isSavingDraft={isSavingDraft}
        saveDraftError={null}
        saveDraftMessage={saveForLaterMessage}
      />
      {modal}
    </>
  )
}

export default GifEditorFlow
