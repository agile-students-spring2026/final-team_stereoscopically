import { useState, useCallback } from 'react'
import { createCreation, updateCreation } from '../../services/creationsApi.js'
import { buildVideoCreationPayload, defaultCreationTitle } from '../../utils/buildCreationPayload.js'
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

function GifEditorFlow({ gifSession, media, originalVideoFile, draft, onVideoSelect, onBack, onDraftSaved }) {
  const { selectedMedia, backendVideoResult } = media
  const { activeDraftId, activeDraftTitle, effectiveVideoDraftSourceMediaId, onActiveDraftSaved } = draft

  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [saveForLaterError, setSaveForLaterError] = useState(null)
  const [saveForLaterMessage, setSaveForLaterMessage] = useState(null)

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

  const handleSaveForLaterVideo = useCallback(async () => {
    if (!selectedMedia) return

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
      return
    }

    try {
      const title = activeDraftTitle || defaultCreationTitle(selectedMedia)
      const editorPayload = buildVideoCreationPayload({
        sourceMediaId,
        workingMediaId,
        previewMediaId: workingMediaId,
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
      onActiveDraftSaved(id ? String(id) : activeDraftId, title)

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
    gifSession,
    onActiveDraftSaved,
    onDraftSaved,
    selectedMedia,
  ])

  const videoKey = selectedMedia
    ? `${selectedMedia.name ?? selectedMedia.id ?? 'video'}-${selectedMedia.lastModified ?? ''}-${selectedMedia.size ?? ''}`
    : 'video'

  if (gifSession.activeTool === gifSession.GIF_FLOW_TOOLS.FILTERS_MAIN) {
    return (
      <GifFilterMain
        onPresetFilters={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.PRESET_FILTERS)}
        onTextOverlay={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.TEXT)}
        onSpeed={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.SPEED)}
        onCancel={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.EDITOR)}
      />
    )
  }

  if (gifSession.activeTool === gifSession.GIF_FLOW_TOOLS.PRESET_FILTERS) {
    const sourceVideoForFilters = originalVideoFile || selectedMedia

    return (
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
    )
  }

  if (gifSession.activeTool === gifSession.GIF_FLOW_TOOLS.TEXT) {
    return (
      <GifTextOverlayEditor
        videoFile={selectedMedia}
        initialSettings={gifSession.textOverlaySettings}
        onChange={gifSession.updateGifTextOverlaySettings}
        onApply={gifSession.applyGifTextOverlaySettings}
        onBack={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.FILTERS_MAIN)}
        onCancel={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.EDITOR)}
      />
    )
  }

  if (gifSession.activeTool === gifSession.GIF_FLOW_TOOLS.SPEED) {
    return (
      <GifSpeedControls
        videoFile={selectedMedia}
        selectedSpeedPlaybackRate={gifSession.selectedSpeedPlaybackRate}
        onSelectSpeed={gifSession.selectSpeed}
        onApplySpeed={gifSession.applySpeed}
        onBack={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.FILTERS_MAIN)}
        onCancel={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.EDITOR)}
      />
    )
  }

  if (gifSession.activeTool === gifSession.GIF_FLOW_TOOLS.RESIZE) {
    return (
      <GifResizePresets
        initialPreset={gifSession.resizePreset}
        initialBorderColor={gifSession.resizeBorderColor}
        videoFile={selectedMedia}
        onApply={handleGifResizeApply}
        onCancel={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.EDITOR)}
      />
    )
  }

  if (gifSession.activeTool === gifSession.GIF_FLOW_TOOLS.TRIM) {
    return (
      <GifTrimEditor
        videoFile={selectedMedia}
        initialTrimStart={gifSession.trimRange.start}
        initialTrimEnd={gifSession.trimRange.end}
        onApply={handleGifTrimApply}
        onCancel={() => gifSession.openGifTool(gifSession.GIF_FLOW_TOOLS.EDITOR)}
      />
    )
  }

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
      onCancel={onBack}
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

export default GifEditorFlow
