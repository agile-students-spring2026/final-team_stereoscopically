import { useCallback, useRef, useState } from 'react'
import './App.css'
import EditorContainer from './components/EditorContainer'
import HomeView from './components/HomeView'
import MyCreationsPage from './components/MyCreationsPage'

const APP_VIEWS = {
  HOME: 'home',
  CREATE: 'create',
  MY_CREATIONS: 'my-creations',
}

function App() {
  const [activeView, setActiveView] = useState(APP_VIEWS.HOME)
  const [creationsRefreshKey, setCreationsRefreshKey] = useState(0)
  const loadDraftRef = useRef(null)

  const handleSelectCreation = useCallback((creation) => {
    setActiveView(APP_VIEWS.CREATE)
    setTimeout(() => loadDraftRef.current?.(creation), 0)
  }, [])

  const renderActiveView = () => {
    if (activeView === APP_VIEWS.CREATE) {
      return (
        <EditorContainer
          onDraftSaved={() => setCreationsRefreshKey((k) => k + 1)}
          onSelectCreation={(registerFn) => {
            loadDraftRef.current = registerFn
          }}
        />
      )
    }

    if (activeView === APP_VIEWS.MY_CREATIONS) {
      return (
        <MyCreationsPage
          refreshKey={creationsRefreshKey}
          onSelectCreation={handleSelectCreation}
        />
      )
    }

    return <HomeView />
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">StickerCreate</h1>
      </header>
      <main className={`app-main ${activeView === APP_VIEWS.CREATE ? 'app-main--create' : ''}`}>
        {renderActiveView()}
      </main>
      <div className="app-bottom-nav-shell">
        <nav className="app-bottom-nav" aria-label="Primary">
          <button
            type="button"
            className={`app-nav-button ${activeView === APP_VIEWS.CREATE ? 'active' : ''}`}
            onClick={() => setActiveView(APP_VIEWS.CREATE)}
          >
            Create New
          </button>
          <button
            type="button"
            className={`app-nav-button ${activeView === APP_VIEWS.HOME ? 'active' : ''}`}
            onClick={() => setActiveView(APP_VIEWS.HOME)}
          >
            Home
          </button>
          <button
            type="button"
            className={`app-nav-button ${activeView === APP_VIEWS.MY_CREATIONS ? 'active' : ''}`}
            onClick={() => setActiveView(APP_VIEWS.MY_CREATIONS)}
          >
            Profile
          </button>
        </nav>
      </div>
    </div>
  )
}

export default App
