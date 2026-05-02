import { useState, useCallback } from 'react'
import { createCreation, updateCreation } from '../../services/creationsApi.js'
import { buildImageCreationPayload, buildSuggestedDraftTitle } from '../../utils/buildCreationPayload.js'
import { getOrCreateOwnerKey } from '../../utils/ownerKey.js'
import { getBackendBaseUrl } from '../../services/backendMediaClient'
import ImageEditor from './ImageEditor'
import FilterMain from '../FilterMain'
import PresetFilters from './PresetFilters'
import PresetSizes from './PresetSizes'
import AddText from './AddText'
import ColorFilters from './ColorFilters'
import SaveDraftModal from '../SaveDraftModal'

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
    draftTitle,
    onDraftTitleChange,
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
  const [showSaveDraftModal, setShowSaveDraftModal] = useState(false)

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

  const guestOwnership = useCallback(() => ({ guestOwnerKey: getOrCreateOwnerKey() }), [])

  const resolveImageDraftTitle = useCallback(() => {
    const trimmed = typeof draftTitle === 'string' ? draftTitle.trim() : ''
    return (
      trimmed ||
      buildSuggestedDraftTitle({
        file: selectedMedia,
        preset: selectedPreset ?? 'custom',
        kind: 'image',
      })
    )
  }, [draftTitle, selectedMedia, selectedPreset])

  const handleSaveForLaterImage = useCallback(async (titleOverride) => {
    if (!selectedMedia) return false

    setSaveForLaterError(null)
    setSaveForLaterMessage(null)
    setIsSavingDraft(true)

    try {
      const title = typeof titleOverride === 'string' && titleOverride.trim()
        ? titleOverride.trim()
        : resolveImageDraftTitle()

      const editorPayload = buildImageCreationPayload({
        sourceMediaId: effectiveImageDraftSourceMediaId || effectiveBackendMediaId,
        workingMediaId: effectiveBackendMediaId || effectiveImageDraftSourceMediaId,
        previewMediaId: effectiveBackendMediaId || effectiveImageDraftSourceMediaId,
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
    resolveImageDraftTitle,
    guestOwnership,
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

  const handleSaveDraftModalConfirm = useCallback(async (name) => {
    const trimmedName = name?.trim() || ''
    if (trimmedName) onDraftTitleChange?.(trimmedName)
    const ok = await handleSaveForLaterImage(trimmedName || undefined)
    if (ok) setShowSaveDraftModal(false)
  }, [handleSaveForLaterImage, onDraftTitleChange])

  const handleOpenSaveDraftModal = useCallback(() => {
    setSaveForLaterError(null)
    setShowSaveDraftModal(true)
  }, [])

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
        const exported = await handleExport()
        if (!exported?.id) return
        try {
          const persistTitle = resolveImageDraftTitle()
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
                title: persistTitle,
                editorPayload: buildImageCreationPayload({
                  sourceMediaId: effectiveImageDraftSourceMediaId || effectiveBackendMediaId,
                  workingMediaId: effectiveBackendMediaId || effectiveImageDraftSourceMediaId,
                  previewMediaId: effectiveBackendMediaId || effectiveImageDraftSourceMediaId,
                  preEditWorkingMediaId: editBaseMediaId || null,
                  preTextWorkingMediaId: preTextWorkingMediaId || null,
                  selectedPreset,
                  letterboxColor,
                  lastCropBoxPx,
                  colorAdjustments,
                  selectedImageFilterPreset,
                  textOverlay: appliedTextOverlay || null,
                }),
                status: 'exported',
                exportAssetId: exported.id,
              },
              guestOwnership(),
            )
            const id = result?._id ?? result?.id
            if (id) onActiveDraftSaved(String(id), persistTitle)
          }
        } catch (err) {
          console.warn('Could not persist export status:', err)
        }
      }}
      onSaveForLater={handleOpenSaveDraftModal}
      isSavingDraft={isSavingDraft}
      saveDraftError={null}
      saveDraftMessage={saveForLaterMessage}
      showResetCrop={hasCropHistory}
    />
  )

  const modal = showSaveDraftModal ? (
    <SaveDraftModal
      currentTitle={draftTitle || resolveImageDraftTitle()}
      onConfirm={handleSaveDraftModalConfirm}
      onCancel={() => { if (!isSavingDraft) setShowSaveDraftModal(false) }}
      isSaving={isSavingDraft}
      saveError={saveForLaterError}
    />
  ) : null

  let screenContent
  switch (imageScreen) {
    case IMAGE_SCREENS.EDITOR:
      screenContent = renderImageEditor()
      break

    case IMAGE_SCREENS.FILTERS_MAIN:
      screenContent = (
        <FilterMain
          onPresetFilters={() => setImageScreen(IMAGE_SCREENS.IMAGE_PRESET_FILTERS)}
          onText={() => setImageScreen(IMAGE_SCREENS.ADD_TEXT)}
          onColorFilters={() => setImageScreen(IMAGE_SCREENS.COLOR_FILTERS)}
          onCancel={() => setImageScreen(IMAGE_SCREENS.EDITOR)}
        />
      )
      break

    case IMAGE_SCREENS.IMAGE_PRESET_FILTERS:
      screenContent = (
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
      break

    case IMAGE_SCREENS.ADD_TEXT: {
      const preTextImageSrc = preTextWorkingMediaId
        ? `${getBackendBaseUrl()}/api/media/${encodeURIComponent(preTextWorkingMediaId)}`
        : effectiveImageSrc

      const initialUiFontSize = appliedTextOverlay?.fontSize
        ? Math.max(2, Math.round(appliedTextOverlay.fontSize / 5))
        : undefined

      screenContent = (
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
      break
    }

    case IMAGE_SCREENS.COLOR_FILTERS:
      screenContent = (
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
      break

    case IMAGE_SCREENS.PRESET_SIZES:
      screenContent = (
        <PresetSizes
          imageSrc={effectiveImageSrc}
          initialPreset={selectedPreset}
          initialLetterboxColor={letterboxColor}
          onApply={handlePresetSizeApply}
          onCancel={() => setImageScreen(IMAGE_SCREENS.EDITOR)}
          isBusy={isExporting}
        />
      )
      break

    default:
      screenContent = renderImageEditor()
  }

  return (
    <>
      {screenContent}
      {modal}
    </>
  )
}

export default ImageEditorFlow
