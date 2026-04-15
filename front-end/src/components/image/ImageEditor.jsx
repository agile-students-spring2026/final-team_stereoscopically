import { useCallback, useState } from 'react'
import ImageCropper from './ImageCropper'
import EditorStatus from '../EditorStatus'

const ImageEditor = ({
  imageSrc,
  cropSourceImageSrc = null,
  initialCropPx = null,
  onCropApply,
  onOpenFilters,
  onBack,
  onSize,
  onExport,
  onResetExportSettings,
  showResetExportSettings = false,
  isUploading = false,
  uploadError = null,
  isExporting = false,
  exportError = null,
  sessionNotice = null,
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
      setCropError('Could not apply crop. Please try again.')
      console.error('Crop failed:', err)
    }
  }

  const handleCancelCrop = () => {
    setIsCropping(false)
    setCropError(null)
  }

  const handleImageError = () => {
    setImageLoadError(true)
  }

  // Show cropper if cropping, otherwise show preview
  if (isCropping) {
    return (
      <div className="image-editor-container">
        <h2 className="image-editor-title">Crop Image</h2>
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
        <div className="card-actions editor-actions editor-actions--inline">
          <button type="button" className="btn-secondary" onClick={handleCancelCrop}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleApplyCrop}>
            Apply Crop
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="image-editor-container">
      <h2 className="image-editor-title">Image Editor</h2>

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
      {sessionNotice && (
        <EditorStatus tone="info" className="session-notice">
          {sessionNotice}
        </EditorStatus>
      )}

      {imageLoadError && (
        <EditorStatus tone="error" spaced>
          This image format cannot be displayed in your browser. Please upload JPG or PNG.
        </EditorStatus>
      )}

      <div
        className="preview-box editor-preview preview-box-checkered editor-preview--checkered"
        style={{ opacity: isUploading ? 0.75 : 1, transition: 'opacity 150ms ease' }}
      >
        {!imageLoadError && (
          <img
            src={imageSrc}
            alt="Preview"
            className="preview-image editor-preview-media"
            onError={handleImageError}
          />
        )}
      </div>
      <div className="card image-editor-actions editor-actions editor-actions--stack">
        <button type="button" className="btn-primary" onClick={handleCropClick}>
          Crop
        </button>
        <button type="button" className="btn-primary" onClick={onSize || (() => {})}>
          Resize
        </button>
        <button type="button" className="btn-primary" onClick={onOpenFilters}>
          Filters
        </button>
        {showResetExportSettings && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onResetExportSettings?.()}
            disabled={isExporting}
          >
            Reset resize
          </button>
        )}
      </div>
      <div className="card-actions card-actions-spaced editor-actions editor-actions--inline">
        <button type="button" className="btn-secondary" onClick={onBack}>
          Cancel
        </button>
        <button type="button" className="btn-primary" onClick={onExport || (() => {})} disabled={isExporting}>
          {isExporting ? 'Exporting...' : 'Export'}
        </button>
      </div>
    </div>
  )
}

export default ImageEditor