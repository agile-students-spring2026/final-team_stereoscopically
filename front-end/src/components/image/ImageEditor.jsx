import { useCallback, useState } from 'react'
import ImageCropper from './ImageCropper'
import EditorStatus from '../EditorStatus'

const RESET_CROP_WARNING = 'Reset crop will remove all edits made in this session. Continue?'

const ImageEditor = ({
  imageSrc,
  cropSourceImageSrc = null,
  initialCropPx = null,
  onCropApply,
  onResetCrop,
  onOpenFilters,
  onBack,
  onSize,
  onExport,
  isUploading = false,
  isResettingCrop = false,
  uploadError = null,
  isExporting = false,
  exportError = null,
  onSaveForLater,
  isSavingDraft = false,
  saveDraftError = null,
  saveDraftMessage = null,
  showResetCrop = false,
}) => {
  // Track if cropper is active
  const [isCropping, setIsCropping] = useState(false)
  // Track current crop data
  const [cropData, setCropData] = useState(null)
  const [imageLoadError, setImageLoadError] = useState(false)
  const [cropError, setCropError] = useState(null)

  const handleCropClick = () => {
    setCropError(null)
    setIsCropping(true)
  }

  const handleCropChange = useCallback((data) => {
    setCropData(data)
  }, [])

  const handleApplyCrop = async () => {
    if (!cropData?.ratio) {
      setCropError('Crop preview is not ready yet. Please try again.')
      return
    }

    try {
      setCropError(null)
      await onCropApply?.(cropData)
      setIsCropping(false)
    } catch (err) {
      setCropError(
        typeof err?.message === 'string' && err.message.trim()
          ? err.message.trim()
          : 'Could not apply crop. Please try again.',
      )
      console.error('Crop failed:', err)
    }
  }

  const handleCancelCrop = () => {
    setIsCropping(false)
    setCropError(null)
  }

  const handleResetCrop = async () => {
    const shouldReset = window.confirm(RESET_CROP_WARNING)
    if (!shouldReset) {
      return
    }

    try {
      setCropError(null)
      await onResetCrop?.()
      setIsCropping(false)
    } catch (err) {
      setCropError(err?.message || 'Could not reset crop to original image.')
      console.error('Reset crop failed:', err)
    }
  }

  const handleImageError = () => {
    setImageLoadError(true)
  }

  // Show cropper if cropping, otherwise show preview
  if (isCropping) {
    return (
      <div className="image-editor-container">
        <h2 className="editor-shell-title">Crop Image</h2>
        <EditorStatus role="note" tone="muted" spaced>
          Cropping uses your current preview (filters and color edits included).
        </EditorStatus>
        {cropError && (
          <EditorStatus tone="error" spaced>
            {cropError}
          </EditorStatus>
        )}
        <ImageCropper
          imageSrc={cropSourceImageSrc || imageSrc}
          initialCropPx={initialCropPx}
          onCropChange={handleCropChange}
        />
        <div className="editor-actions editor-actions--inline">
          <button type="button" className="btn-secondary" onClick={handleCancelCrop}>
            Cancel
          </button>
          {showResetCrop && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleResetCrop}
              disabled={isResettingCrop}
            >
              {isResettingCrop ? 'Resetting...' : 'Reset Crop'}
            </button>
          )}
          <button type="button" className="btn-primary" onClick={handleApplyCrop} disabled={isExporting}>
            {isExporting ? 'Applying crop…' : 'Apply Crop'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="image-editor-container">
      <h2 className="editor-shell-title">Image Editor</h2>

      {uploadError && (
        <EditorStatus tone="error" spaced>
          {uploadError}
        </EditorStatus>
      )}
      {exportError && (
        <EditorStatus tone="error" spaced>
          {exportError}
        </EditorStatus>
      )}
      {saveDraftError && (
        <EditorStatus tone="error" spaced>
          {saveDraftError}
        </EditorStatus>
      )}
      {saveDraftMessage && !saveDraftError && (
        <EditorStatus tone="info" spaced>
          {saveDraftMessage}
        </EditorStatus>
      )}

      {imageLoadError && (
        <EditorStatus tone="error" spaced>
          This image format cannot be displayed in your browser. Please upload JPG or PNG.
        </EditorStatus>
      )}

      <div
        className="editor-preview editor-preview--checkered"
        style={{ opacity: isUploading ? 0.75 : 1, transition: 'opacity 150ms ease' }}
      >
        {!imageLoadError && (
          <img
            src={imageSrc}
            alt="Preview"
            className="editor-preview-media"
            onError={handleImageError}
          />
        )}
      </div>
      <div className="card editor-actions editor-actions--stack">
        <button
          type="button"
          className="btn-primary"
          onClick={handleCropClick}
          disabled={isUploading || isExporting || isSavingDraft}
        >
          Crop
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={onSize || (() => {})}
          disabled={isUploading || isExporting || isSavingDraft}
        >
          Resize
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={onOpenFilters}
          disabled={isUploading || isExporting || isSavingDraft}
        >
          Filters
        </button>
      </div>
      <div className="editor-actions editor-actions--spaced editor-actions--inline editor-actions--wrap">
        <button type="button" className="btn-secondary" onClick={onBack}>
          Cancel
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={onSaveForLater}
          disabled={isUploading || isExporting || isSavingDraft}
        >
          {isSavingDraft ? 'Saving…' : 'Save for later'}
        </button>
        <button type="button" className="btn-primary" onClick={onExport || (() => {})} disabled={isExporting || isSavingDraft}>
          {isExporting ? 'Exporting...' : 'Export'}
        </button>
      </div>
    </div>
  )
}

export default ImageEditor