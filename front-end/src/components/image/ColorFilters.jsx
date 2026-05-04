import FilterScreen from '../FilterScreen'
import EditorStatus from '../EditorStatus'

const DEFAULT_COLOR_ADJUSTMENTS = Object.freeze({
  brightness: 100,
  contrast: 100,
  saturation: 100,
  sharpness: 100,
})

function ColorFilters({
  imageSrc,
  adjustments = DEFAULT_COLOR_ADJUSTMENTS,
  previewSrc,
  onAdjustmentsChange,
  onApply,
  onCancel,
  applyError,
  previewError,
  isLoadingPreview = false,
}) {
  const brightness = adjustments?.brightness ?? DEFAULT_COLOR_ADJUSTMENTS.brightness
  const contrast = adjustments?.contrast ?? DEFAULT_COLOR_ADJUSTMENTS.contrast
  const saturation = adjustments?.saturation ?? DEFAULT_COLOR_ADJUSTMENTS.saturation
  const sharpness = adjustments?.sharpness ?? DEFAULT_COLOR_ADJUSTMENTS.sharpness

  return (
    <FilterScreen
      title="Color Filters"
      imageSrc={previewSrc || imageSrc}
      onApply={onApply}
      onCancel={onCancel}
      cancelLabel="Back to editor"
      previewOverlay={isLoadingPreview ? (
        <div className="editor-preview-overlay editor-preview-overlay--loading editor-preview-overlay--nonblocking">
          <EditorStatus tone="loading" centered className="editor-preview-overlay__status">
            Updating preview…
          </EditorStatus>
        </div>
      ) : null}
    >
      <div className="color-filters-panel">
        {(previewError || applyError) && (
          <p className="validation-error" role="alert">
            {previewError || applyError}
          </p>
        )}
        <div>
          <label className="editor-range-field">
            Brightness: {brightness}%
            <input
              type="range"
              min="0"
              max="200"
              value={brightness}
              onChange={(e) => onAdjustmentsChange?.({ brightness: Number(e.target.value) })}
              className="slider-wrapper editor-slider"
            />
          </label>
        </div>
        <div>
          <label className="editor-range-field">
            Contrast: {contrast}%
            <input
              type="range"
              min="0"
              max="200"
              value={contrast}
              onChange={(e) => onAdjustmentsChange?.({ contrast: Number(e.target.value) })}
              className="slider-wrapper editor-slider"
            />
          </label>
        </div>
        <div>
          <label className="editor-range-field">
            Saturation: {saturation}%
            <input
              type="range"
              min="0"
              max="200"
              value={saturation}
              onChange={(e) => onAdjustmentsChange?.({ saturation: Number(e.target.value) })}
              className="slider-wrapper editor-slider"
            />
          </label>
        </div>
        <div>
          <label className="editor-range-field">
            Sharpness: {sharpness}%
            <input
              type="range"
              min="0"
              max="200"
              value={sharpness}
              onChange={(e) => onAdjustmentsChange?.({ sharpness: Number(e.target.value) })}
              className="slider-wrapper editor-slider"
            />
          </label>
        </div>
      </div>
    </FilterScreen>
  )
}

export default ColorFilters
