import { useEffect, useState } from 'react'
import FilterScreen from '../FilterScreen'
import { adjustImageFromBackend } from '../../services/backendImageService'

const pctToFactor = (pct) => Math.min(2, Math.max(0, pct / 100))

function ColorFilters({ imageSrc, mediaId, onApply, onCancel, applyError }) {
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [sharpness, setSharpness] = useState(100)
  const [previewSrc, setPreviewSrc] = useState(imageSrc)
  const [previewError, setPreviewError] = useState(null)

  useEffect(() => {
    setPreviewSrc(imageSrc)
  }, [imageSrc])

  useEffect(() => {
    if (!mediaId) {
      setPreviewError('Image is not ready on the server yet.')
      return
    }
    setPreviewError(null)
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const result = await adjustImageFromBackend({
          mediaId,
          brightness: pctToFactor(brightness),
          contrast: pctToFactor(contrast),
          saturation: pctToFactor(saturation),
          sharpness: pctToFactor(sharpness),
        })
        if (cancelled || !result?.url) return
        setPreviewSrc(`${result.url}?cb=${Date.now()}`)
      } catch (err) {
        if (!cancelled) {
          setPreviewError(err?.message || 'Preview update failed.')
        }
      }
    }, 220)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [mediaId, brightness, contrast, saturation, sharpness])

  const handleApply = async () => {
    if (!mediaId) return
    try {
      const result = await adjustImageFromBackend({
        mediaId,
        brightness: pctToFactor(brightness),
        contrast: pctToFactor(contrast),
        saturation: pctToFactor(saturation),
        sharpness: pctToFactor(sharpness),
      })
      await onApply?.(result)
    } catch (err) {
      setPreviewError(err?.message || 'Could not apply adjustments.')
    }
  }

  return (
    <FilterScreen
      title="Color Filters"
      imageSrc={previewSrc}
      onApply={handleApply}
      onCancel={onCancel}
    >
      <div className="color-filters-panel">
        {(previewError || applyError) && (
          <p className="validation-error" role="alert">
            {previewError || applyError}
          </p>
        )}
        <div>
          <label>
            Brightness: {brightness}%
            <input
              type="range"
              min="0"
              max="200"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="slider-wrapper"
            />
          </label>
        </div>
        <div>
          <label>
            Contrast: {contrast}%
            <input
              type="range"
              min="0"
              max="200"
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
              className="slider-wrapper"
            />
          </label>
        </div>
        <div>
          <label>
            Saturation: {saturation}%
            <input
              type="range"
              min="0"
              max="200"
              value={saturation}
              onChange={(e) => setSaturation(Number(e.target.value))}
              className="slider-wrapper"
            />
          </label>
        </div>
        <div>
          <label>
            Sharpness: {sharpness}%
            <input
              type="range"
              min="0"
              max="200"
              value={sharpness}
              onChange={(e) => setSharpness(Number(e.target.value))}
              className="slider-wrapper"
            />
          </label>
        </div>
      </div>
    </FilterScreen>
  )
}

export default ColorFilters
