import { useEffect, useMemo, useState } from 'react'
import FilterScreen from '../FilterScreen'

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

  const videoUrl = useMemo(() => {
    if (!videoFile) return null
    if (videoFile instanceof File) return URL.createObjectURL(videoFile)
    return videoFile?.url || null
  }, [videoFile])

  useEffect(() => {
    if (!(videoFile instanceof File) || !videoUrl) return
    return () => {
      if (import.meta.env.PROD) {
        URL.revokeObjectURL(videoUrl)
      }
    }
  }, [videoFile, videoUrl])

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
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: '600',
          }}
        >
          Applying filter…
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
        <p className="validation-error" role="alert">
          {applyError || previewError}
        </p>
      )}
    </FilterScreen>
  )
}

export default VideoPresetFilters