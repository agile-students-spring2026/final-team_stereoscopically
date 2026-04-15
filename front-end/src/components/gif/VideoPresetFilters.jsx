import { useEffect, useMemo, useRef, useState } from 'react'
import FilterScreen from '../FilterScreen'
import { applyVideoFilter } from '../../services/backendGifService'

const PRESETS = [
  { id: 'default', label: 'Original' },
  { id: 'noir', label: 'Noir' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'vivid', label: 'Vivid' },
  { id: 'fade', label: 'Fade' },
]

function VideoPresetFilters({ videoFile, onApply, onCancel }) {
  const [selectedStyle, setSelectedStyle] = useState('default')
  const [isApplying, setIsApplying] = useState(false)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [applyError, setApplyError] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewResult, setPreviewResult] = useState(null)
  const previewRequestIdRef = useRef(0)

  const videoUrl = useMemo(() => {
    if (!videoFile) return null
    if (videoFile instanceof File) return URL.createObjectURL(videoFile)
    return videoFile?.url || null
  }, [videoFile])

  useEffect(() => {
    if (!(videoFile instanceof File) || !videoUrl) return
    return () => {
      URL.revokeObjectURL(videoUrl)
    }
  }, [videoFile, videoUrl])

  useEffect(() => {
    previewRequestIdRef.current += 1
    setSelectedStyle('default')
    setIsApplying(false)
    setIsLoadingPreview(false)
    setApplyError(null)
    setPreviewUrl(null)
    setPreviewResult(null)
  }, [videoFile])

  const handleSelectStyle = async (id) => {
    const requestId = ++previewRequestIdRef.current
    setSelectedStyle(id)
    setApplyError(null)
    if (id === 'default') {
      setPreviewUrl(null)
      setPreviewResult(null)
      return
    }
    if (!videoFile) return
    try {
      setIsLoadingPreview(true)
      const result = await applyVideoFilter(videoFile, id)
      if (requestId !== previewRequestIdRef.current) return
      setPreviewUrl(result?.url || null)
      setPreviewResult(result || null)
    } catch (err) {
      if (requestId !== previewRequestIdRef.current) return
      setApplyError(err?.message || 'Preview failed.')
      setPreviewResult(null)
    } finally {
      if (requestId === previewRequestIdRef.current) {
        setIsLoadingPreview(false)
      }
    }
  }

  const handleApply = async () => {
    try {
      if (selectedStyle === 'default') {
        await onApply?.(null)
        return
      }
      if (!videoFile) return
      setIsApplying(true)
      const result =
        previewResult?.preset === selectedStyle && previewResult?.url
          ? previewResult
          : await applyVideoFilter(videoFile, selectedStyle)
      await onApply?.(result)
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
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '1rem',
          fontWeight: '600',
        }}>
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
      {applyError && (
        <p className="validation-error" role="alert">
          {applyError}
        </p>
      )}
    </FilterScreen>
  )
}

export default VideoPresetFilters