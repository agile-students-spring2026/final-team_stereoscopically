import { useEffect, useState } from 'react'
import FilterScreen from '../FilterScreen'
import EditorStatus from '../EditorStatus'
import useVideoPreviewUrl from '../../hooks/useVideoPreviewUrl'

const PRESETS = [
  { id: 'default', label: 'Original' },
  { id: 'noir', label: 'Noir' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'vivid', label: 'Vivid' },
  { id: 'fade', label: 'Fade' },
]

function VideoPresetFilters({
  videoFile,
  selectedFilter,
  onSelectFilter,
  onApply,
  onCancel,
  isLoadingPreview,
  previewError,
  previewUrl,
}) {
  const [selectedStyle, setSelectedStyle] = useState('default')
  const [isApplying, setIsApplying] = useState(false)
  const [applyError, setApplyError] = useState(null)

  const videoUrl = useVideoPreviewUrl(videoFile)

  useEffect(() => {
    setSelectedStyle('default')
    setIsApplying(false)
    setApplyError(null)
  }, [videoFile])

  useEffect(() => {
    // Keep local selectedStyle in sync with external session state
    setSelectedStyle(selectedFilter || 'default')
  }, [selectedFilter])

  const handleSelectStyle = (id) => {
    setApplyError(null)
    setSelectedStyle(id)
    onSelectFilter?.(id)
  }

  const handleApply = async () => {
    try {
      setIsApplying(true)
      await onApply?.()
    } catch (err) {
      setApplyError(err?.message || 'Could not apply preset.')
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <FilterScreen
      title="Preset Filters"
      imageSrc={null}
      videoSrc={previewUrl || videoUrl}
      onApply={handleApply}
      onCancel={onCancel}
      previewOverlay={isLoadingPreview ? (
        <div className="editor-preview-overlay editor-preview-overlay--loading">
          <EditorStatus tone="loading" centered className="editor-preview-overlay__status">
            Applying filter…
          </EditorStatus>
        </div>
      ) : null}
    >
      {PRESETS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className={`btn-secondary preset-filters-button ${selectedStyle === id ? 'active' : ''}`}
          onClick={() => handleSelectStyle(id)}
          disabled={isApplying || isLoadingPreview}
        >
          {label}
        </button>
      ))}
      {(previewError || applyError) && (
        <EditorStatus tone="error">
          {applyError || previewError}
        </EditorStatus>
      )}
    </FilterScreen>
  )
}

export default VideoPresetFilters