import { useEffect, useState } from 'react'
import FilterScreen from '../FilterScreen'
import { applyPresetImageFilterFromBackend } from '../../services/backendImageService'

const PRESETS = [
  { id: 'default', label: 'Original' },
  { id: 'noir', label: 'Noir' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'vivid', label: 'Vivid' },
  { id: 'fade', label: 'Fade' },
]

function PresetFilters({ imageSrc, mediaId, onApply, onCancel, applyError }) {
  const [selectedStyle, setSelectedStyle] = useState('default')
  const [previewSrc, setPreviewSrc] = useState(imageSrc)
  const [previewError, setPreviewError] = useState(null)

  useEffect(() => {
    setPreviewSrc(imageSrc)
  }, [imageSrc])

  useEffect(() => {
    if (selectedStyle === 'default') {
      setPreviewSrc(imageSrc)
      setPreviewError(null)
      return
    }
    if (!mediaId) {
      setPreviewError('Image is not ready on the server yet.')
      return
    }
    setPreviewError(null)
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const result = await applyPresetImageFilterFromBackend({
          mediaId,
          preset: selectedStyle,
        })
        if (cancelled || !result?.url) return
        setPreviewSrc(`${result.url}?cb=${Date.now()}`)
      } catch (err) {
        if (!cancelled) {
          setPreviewError(err?.message || 'Preview update failed.')
        }
      }
    }, 180)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [mediaId, selectedStyle, imageSrc])

  const handleApply = async () => {
    try {
      if (selectedStyle === 'default') {
        await onApply?.(null)
        return
      }
      if (!mediaId) return
      const result = await applyPresetImageFilterFromBackend({ mediaId, preset: selectedStyle })
      await onApply?.(result)
    } catch (err) {
      setPreviewError(err?.message || 'Could not apply preset.')
    }
  }

  return (
    <FilterScreen
      title="Preset Filters"
      imageSrc={previewSrc}
      onApply={handleApply}
      onCancel={onCancel}
    >
      {PRESETS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className={`btn-secondary preset-filters-button ${selectedStyle === id ? 'active' : ''}`}
          onClick={() => setSelectedStyle(id)}
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
