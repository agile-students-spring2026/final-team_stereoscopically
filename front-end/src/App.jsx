import { useState } from 'react'
import './App.css'
import BottomNav from './components/BottomNav'
import Homepage from './pages/Homepage'
import MyCreations from './pages/MyCreations'
import CreateNew from './pages/CreateNew'
import ImageEditor from './pages/ImageEditor'
import FilterMain from './pages/FilterMain'
import PresetFilters from './pages/PresetFilters'
import AddText from './pages/AddText'
import ColorFilters from './pages/ColorFilters'
import PresetSizes from './pages/PresetSizes'
import Settings from './pages/Settings'

function App() {
  const [screen, setScreen] = useState('homepage')
  const [filterSubScreen, setFilterSubScreen] = useState(null)
  const showBottomNav = [
    'my-creations',
    'create-new',
    'settings',
    'image-editor',
    'filter-main',
    'preset-filters',
    'add-text',
    'color-filters',
    'preset-sizes',
  ].includes(screen) || filterSubScreen

  const bottomNavScreen =
    screen === 'create-new' ||
    screen === 'image-editor' ||
    screen === 'filter-main' ||
    filterSubScreen
      ? 'create-new'
      : screen

  const goTo = (s) => {
    setScreen(s)
    setFilterSubScreen(null)
  }

  return (
    <>
      {screen === 'homepage' && (
        <Homepage
          onLogin={() => goTo('login')}
          onCreateAccount={() => goTo('signup')}
          onGuestMode={() => goTo('my-creations')}
        />
      )}

      {screen === 'my-creations' && <MyCreations />}
      {screen === 'create-new' && (
        <CreateNew
          onOpenCamera={() => goTo('image-editor')}
          onUploadImage={() => goTo('image-editor')}
          onUploadVideo={() => goTo('image-editor')}
          onCancel={() => goTo('my-creations')}
        />
      )}
      {screen === 'settings' && <Settings onLogout={() => goTo('homepage')} />}

      {screen === 'image-editor' && (
        <ImageEditor
          previewImage={null}
          onSize={() => goTo('preset-sizes')}
          onReframe={() => {}}
          onFilters={() => goTo('filter-main')}
          onExport={() => goTo('my-creations')}
          onCancel={() => goTo('create-new')}
        />
      )}

      {screen === 'filter-main' && !filterSubScreen && (
        <FilterMain
          onPresetFilters={() => setFilterSubScreen('preset')}
          onAddText={() => setFilterSubScreen('add-text')}
          onColorFilters={() => setFilterSubScreen('color')}
          onApply={() => goTo('image-editor')}
          onCancel={() => goTo('image-editor')}
        />
      )}

      {screen === 'filter-main' && filterSubScreen === 'preset' && (
        <PresetFilters
          onApply={() => setFilterSubScreen(null)}
          onCancel={() => setFilterSubScreen(null)}
        />
      )}
      {screen === 'filter-main' && filterSubScreen === 'add-text' && (
        <AddText
          onApply={() => setFilterSubScreen(null)}
          onCancel={() => setFilterSubScreen(null)}
        />
      )}
      {screen === 'filter-main' && filterSubScreen === 'color' && (
        <ColorFilters
          onApply={() => setFilterSubScreen(null)}
          onCancel={() => setFilterSubScreen(null)}
        />
      )}

      {screen === 'preset-sizes' && (
        <PresetSizes
          onSelect={(size) => {
            console.log('Selected size:', size)
            goTo('image-editor')
          }}
          onCancel={() => goTo('image-editor')}
        />
      )}

      {showBottomNav && (
        <BottomNav
          currentScreen={bottomNavScreen}
          onNavigate={(s) => {
            setFilterSubScreen(null)
            goTo(s)
          }}
        />
      )}
    </>
  )
}

export default App
