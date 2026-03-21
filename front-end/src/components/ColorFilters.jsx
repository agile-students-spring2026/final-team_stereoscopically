import { useState } from 'react'
import FilterScreen from './FilterScreen'

function ColorFilters({ imageSrc, onApply, onCancel }) {
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [sharpness, setSharpness] = useState(100)

  const handleApply = () => {
    onApply({ brightness, contrast, saturation, sharpness })
  }

  return (
    <FilterScreen
      title="Color Filters"
      imageSrc={imageSrc}
      onApply={handleApply}
      onCancel={onCancel}
    >
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
    </FilterScreen>
  )
}

export default ColorFilters
