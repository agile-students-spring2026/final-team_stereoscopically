import { useState, useCallback } from 'react'
import { createCreation, updateCreation } from '../../services/creationsApi.js'
import { buildImageCreationPayload, defaultCreationTitle } from '../../utils/buildCreationPayload.js'
import { getOrCreateOwnerKey } from '../../utils/ownerKey.js'
import { getBackendBaseUrl } from '../../services/backendMediaClient'
import ImageEditor from './ImageEditor'
import FilterMain from '../FilterMain'
import PresetFilters from './PresetFilters'
import PresetSizes from './PresetSizes'
import AddText from './AddText'
import ColorFilters from './ColorFilters'

const IMAGE_SCREENS = {
  EDITOR: 'editor',
  FILTERS_MAIN: 'filters-main',
  IMAGE_PRESET_FILTERS: 'image-preset-filters',
  ADD_TEXT: 'text',
  COLOR_FILTERS: 'color',
  PRESET_SIZES: 'preset-sizes',
}

function ImageEditorFlow({ imageSession, media, draft, textOverlay, onBack, onDraftSaved }) {
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
    presetFilterPreviewSrc,
    isLoadingPresetFilterPreview,
    presetFilterError,
    colorFilterPreviewSrc,
    isLoadingColorFilterPreview,
    colorFilterError,
    handleSizeSelect,
    handleCropApply,
    handleAddTextApply,
    handleExport,
    selectImageFilterPreset,
    applyImagePresetFilter,
    updateColorAdjustments,
    applyColorAdjustments,
    resetCropToOriginal,
    editBaseMediaId,
  } = imageSession

  const { selectedMedia, isUploading, uploadError } = media
  const {
    activeDraftId,
    activeDraftTitle,
    effectiveImageDraftSourceMediaId,
    onActiveDraftSaved,
  } = draft
  const {
    appliedTextOverlay,
    preTextWorkingMediaId,
    onAppliedTextOverlayChange,
    onPreTextWorkingMediaIdChange,
  } = textOverlay

  const [imageScreen, setImageScreen] = useState(IMAGE_SCREENS.EDITOR)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [saveForLaterError, setSaveForLaterError] = useState(null)
  const [saveForLaterMessage, setSaveForLaterMessage] = useState(null)

  const handleOpenFilters = () => setImageScreen(IMAGE_SCREENS.FILTERS_MAIN)
  const handleOpenSizes = () => setImageScreen(IMAGE_SCREENS.PRESET_SIZES)

  const handleCropApplyWrapped = useCallback(
    async (cropRequest) => {
      const result = await handleCropApply(cropRequest)
      onAppliedTextOverlayChange(null)
      onPreTextWorkingMediaIdChange(null)
      return result
    },
    [handleCropApply, onAppliedTextOverlayChange, onPreTextWorkingMediaIdChange],
  )

  const handlePresetSizeApply = async ({ preset, letterboxColor: nextLetterboxColor }) => {
    const applied = await handleSizeSelect(preset, { letterboxColor: nextLetterboxColor })
    if (!applied) return
    setLetterboxColor(nextLetterboxColor)
    setImageScreen(IMAGE_SCREENS.EDITOR)
  }

  const handleAddTextScreenApply = async (textRequest) => {
    const baseForText = preTextWorkingMediaId || effectiveBackendMediaId

    if (!preTextWorkingMediaId && effectiveBackendMediaId) {
      onPreTextWorkingMediaIdChange(effectiveBackendMediaId)
    }

    const applied = await handleAddTextApply({
      ...textRequest,
      _overrideBaseMediaId: baseForText || undefined,
    })

    if (applied) {
      onAppliedTextOverlayChange({
        text: textRequest?.text ?? '',
        font: textRequest?.font || textRequest?.fontFamily || 'Arial',
        color: textRequest?.color || '#111111',
        fontSize: textRequest?.fontSize ?? null,
        x: textRequest?.x ?? 0.5,
        y: textRequest?.y ?? 0.5,
      })
      setImageScreen(IMAGE_SCREENS.EDITOR)
    }
  }

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
        previewMediaId: effectiveBackendMediaId || effectiveImageDraftSourceMediaId,

        // these two are still important helper bases for restore/re-edit flows
        preEditWorkingMediaId: editBaseMediaId || null,
        preTextWorkingMediaId: preTextWorkingMediaId || null,

        selectedPreset,
        letterboxColor,
        lastCropBoxPx,
        colorAdjustments,
        selectedImageFilterPreset,
        textOverlay: appliedTextOverlay || null,
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
    appliedTextOverlay,
    colorAdjustments,
    editBaseMediaId,
    effectiveBackendMediaId,
    effectiveImageDraftSourceMediaId,
    lastCropBoxPx,
    letterboxColor,
    onActiveDraftSaved,
    onDraftSaved,
    preTextWorkingMediaId,
    selectedImageFilterPreset,
    selectedMedia,
    selectedPreset,
  ])

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
      onBack={onBack}
      onOpenFilters={handleOpenFilters}
      onSize={handleOpenSizes}
      onExport={async () => {
        const success = await handleExport()
        if (success) {
          try {
            if (activeDraftId) {
              await updateCreation(activeDraftId, { status: 'exported' })
            } else {
              const result = await createCreation({
                ownerKey: getOrCreateOwnerKey(),
                title: defaultCreationTitle(selectedMedia),
                editorPayload: buildImageCreationPayload({
                  backendMediaId: effectiveBackendMediaId,
                  lastCropBoxPx,
                  colorAdjustments,
                  selectedImageFilterPreset,
                  selectedPreset,
                  letterboxColor,
                }),
                status: 'exported',
              })
              const id = result?._id ?? result?.id
              if (id) onActiveDraftSaved(String(id), null)
            }
          } catch (err) {
            console.warn('Could not persist export status:', err)
          }
        }
      }}
      onSaveForLater={handleSaveForLaterImage}
      isSavingDraft={isSavingDraft}
      saveDraftError={saveForLaterError}
      saveDraftMessage={saveForLaterMessage}
      showResetCrop={hasCropHistory}
    />
  )

  switch (imageScreen) {
    case IMAGE_SCREENS.EDITOR:
      return renderImageEditor()

    case IMAGE_SCREENS.FILTERS_MAIN:
      return (
        <FilterMain
          onPresetFilters={() => setImageScreen(IMAGE_SCREENS.IMAGE_PRESET_FILTERS)}
          onText={() => setImageScreen(IMAGE_SCREENS.ADD_TEXT)}
          onColorFilters={() => setImageScreen(IMAGE_SCREENS.COLOR_FILTERS)}
          onCancel={() => setImageScreen(IMAGE_SCREENS.EDITOR)}
        />
      )

    case IMAGE_SCREENS.IMAGE_PRESET_FILTERS:
      return (
        <PresetFilters
          imageSrc={effectiveImageSrc}
          selectedStyle={selectedImageFilterPreset}
          previewSrc={presetFilterPreviewSrc}
          onSelectStyle={selectImageFilterPreset}
          onApply={async () => {
            const applied = await applyImagePresetFilter()
            if (applied) setImageScreen(IMAGE_SCREENS.EDITOR)
          }}
          onCancel={() => setImageScreen(IMAGE_SCREENS.FILTERS_MAIN)}
          applyError={exportError}
          previewError={presetFilterError}
          isLoadingPreview={isLoadingPresetFilterPreview}
        />
      )

    case IMAGE_SCREENS.ADD_TEXT: {
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
          initialPlacement={
            appliedTextOverlay
              ? { x: appliedTextOverlay.x, y: appliedTextOverlay.y }
              : undefined
          }
          onApply={handleAddTextScreenApply}
          onBack={() => setImageScreen(IMAGE_SCREENS.FILTERS_MAIN)}
          onCancel={() => setImageScreen(IMAGE_SCREENS.EDITOR)}
          applyError={exportError}
        />
      )
    }

    case IMAGE_SCREENS.COLOR_FILTERS:
      return (
        <ColorFilters
          imageSrc={effectiveImageSrc}
          adjustments={colorAdjustments}
          previewSrc={colorFilterPreviewSrc}
          onAdjustmentsChange={updateColorAdjustments}
          onApply={async () => {
            const applied = await applyColorAdjustments()
            if (applied) setImageScreen(IMAGE_SCREENS.EDITOR)
          }}
          onCancel={() => setImageScreen(IMAGE_SCREENS.EDITOR)}
          applyError={exportError}
          previewError={colorFilterError}
          isLoadingPreview={isLoadingColorFilterPreview}
        />
      )

    case IMAGE_SCREENS.PRESET_SIZES:
      return (
        <PresetSizes
          imageSrc={effectiveImageSrc}
          initialPreset={selectedPreset}
          initialLetterboxColor={letterboxColor}
          onApply={handlePresetSizeApply}
          onCancel={() => setImageScreen(IMAGE_SCREENS.EDITOR)}
          isBusy={isExporting}
        />
      )

    default:
      return renderImageEditor()
  }
}

export default ImageEditorFlow