import { useState } from 'react'
import FilterScreen from './FilterScreen'

function PresetFilters({ onApply, onCancel }) {
  const [selectedStyle, setSelectedStyle] = useState('default')

  const handleApply = () => {
    onApply(selectedStyle)
  }

  return (
    <FilterScreen
      title="Preset Filters"
      onApply={handleApply}
      onCancel={onCancel}
    >
      {['default', 'style1', 'style2'].map((style) => (
        <button
          key={style}
          type="button"
          className={`btn-secondary preset-filters-button ${selectedStyle === style ? 'active' : ''}`}
          onClick={() => setSelectedStyle(style)}
        >
          {style === 'style1' ? 'Style 1' : style === 'style2' ? 'Style 2' : 'Default'}
        </button>
      ))}
    </FilterScreen>
  )
}

export default PresetFilters
