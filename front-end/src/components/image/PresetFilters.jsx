import FilterScreen from '../FilterScreen'
import EditorStatus from '../EditorStatus'
import { PRESET_FILTER_OPTIONS } from '../../constants/editorPresets'

function PresetFilters({
  imageSrc,
  selectedStyle = 'default',
  previewSrc,
  onSelectStyle,
  onApply,
  onCancel,
  applyError,
  previewError,
  isLoadingPreview = false,
}) {

  return (
    <FilterScreen
      title="Preset Filters"
      imageSrc={previewSrc || imageSrc}
      onApply={onApply}
      onCancel={onCancel}
      cancelLabel="Filter menu"
      previewOverlay={isLoadingPreview ? (
        <div className="editor-preview-overlay editor-preview-overlay--loading">
          <EditorStatus tone="loading" centered className="editor-preview-overlay__status">
            Applying filter…
          </EditorStatus>
        </div>
      ) : null}
    >
      {PRESET_FILTER_OPTIONS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className={`btn-secondary preset-filters-button ${selectedStyle === id ? 'active' : ''}`}
          onClick={() => onSelectStyle?.(id)}
        >
          {label}
        </button>
      ))}
      {(previewError || applyError) && (
        <p className="validation-error" role="alert" style={{ gridColumn: '1 / -1' }}>
          {previewError || applyError}
        </p>
      )}
    </FilterScreen>
  )
}

export default PresetFilters
