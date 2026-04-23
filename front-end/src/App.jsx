import { useState } from 'react'
import './App.css'
import EditorContainer from './components/EditorContainer'
import MyCreationsPage from './components/MyCreationsPage'

function App() {
  const [view, setView] = useState('create')
  const [creationsRefreshKey, setCreationsRefreshKey] = useState(0)

  return (
    <div className="app-container">
      <header className="app-header app-header--nav">
        <h1 className="app-title">StickerCreate</h1>
        <nav className="app-nav" aria-label="Main">
          <button
            type="button"
            className={view === 'create' ? 'app-nav-link app-nav-link--active' : 'app-nav-link'}
            onClick={() => setView('create')}
          >
            Create
          </button>
          <button
            type="button"
            className={view === 'creations' ? 'app-nav-link app-nav-link--active' : 'app-nav-link'}
            onClick={() => setView('creations')}
          >
            My Creations
          </button>
        </nav>
      </header>
      <main className="app-main">
        <div className="app-view" hidden={view !== 'create'}>
          <EditorContainer onDraftSaved={() => setCreationsRefreshKey((k) => k + 1)} />
        </div>
        <div className="app-view" hidden={view !== 'creations'}>
          <MyCreationsPage refreshKey={creationsRefreshKey} />
        </div>
      </main>
    </div>
  )
}

export default App
