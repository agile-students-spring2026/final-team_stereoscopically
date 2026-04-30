import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import { clearAuthToken, getAuthToken } from './auth/authSession.js'
import AuthLanding from './components/AuthLanding'
import EditorContainer from './components/EditorContainer'
import HomeView from './components/HomeView'
import MyCreationsPage from './components/MyCreationsPage'
import SignInPage from './components/SignInPage'
import SignUpPage from './components/SignUpPage'
import * as authApi from './services/authApi.js'

const APP_SCREENS = {
  LANDING: 'landing',
  SIGN_IN: 'sign-in',
  SIGN_UP: 'sign-up',
  APP: 'app',
}

const APP_VIEWS = {
  HOME: 'home',
  CREATE: 'create',
  MY_CREATIONS: 'my-creations',
}

function App() {
  const [appScreen, setAppScreen] = useState(() =>
    getAuthToken() ? APP_SCREENS.APP : APP_SCREENS.LANDING
  )
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [activeView, setActiveView] = useState(APP_VIEWS.HOME)
  const [creationsRefreshKey, setCreationsRefreshKey] = useState(0)
  const loadDraftRef = useRef(null)

  useEffect(() => {
    const onExpire = () => {
      setCurrentUser(null)
      setIsAuthenticated(false)
      setAppScreen(APP_SCREENS.SIGN_IN)
    }
    window.addEventListener('auth:session-expired', onExpire)
    return () => window.removeEventListener('auth:session-expired', onExpire)
  }, [])

  useEffect(() => {
    if (!getAuthToken()) return undefined
    let cancelled = false
    ;(async () => {
      try {
        const user = await authApi.fetchCurrentUser()
        if (cancelled) return
        setCurrentUser(user)
        setIsAuthenticated(true)
        setAppScreen(APP_SCREENS.APP)
      } catch {
        if (!cancelled) {
          clearAuthToken()
          setIsAuthenticated(false)
          setCurrentUser(null)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSelectCreation = useCallback((creation) => {
    setActiveView(APP_VIEWS.CREATE)
    setTimeout(() => loadDraftRef.current?.(creation), 0)
  }, [])

  if (appScreen === APP_SCREENS.LANDING) {
    return (
      <AuthLanding
        onSignIn={() => setAppScreen(APP_SCREENS.SIGN_IN)}
        onSignUp={() => setAppScreen(APP_SCREENS.SIGN_UP)}
        onGuest={() => {
          clearAuthToken()
          setCurrentUser(null)
          setIsAuthenticated(false)
          setAppScreen(APP_SCREENS.APP)
        }}
      />
    )
  }

  if (appScreen === APP_SCREENS.SIGN_IN) {
    return (
      <SignInPage
        onSuccess={(user) => {
          setCurrentUser(user)
          setIsAuthenticated(true)
          setAppScreen(APP_SCREENS.APP)
        }}
        onBack={() => setAppScreen(APP_SCREENS.LANDING)}
        onGoSignUp={() => setAppScreen(APP_SCREENS.SIGN_UP)}
      />
    )
  }

  if (appScreen === APP_SCREENS.SIGN_UP) {
    return (
      <SignUpPage
        onSuccess={(user) => {
          setCurrentUser(user)
          setIsAuthenticated(true)
          setAppScreen(APP_SCREENS.APP)
        }}
        onBack={() => setAppScreen(APP_SCREENS.LANDING)}
        onGoSignIn={() => setAppScreen(APP_SCREENS.SIGN_IN)}
      />
    )
  }

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
          isAuthenticated={isAuthenticated}
          currentUser={currentUser}
          onGoSignIn={() => setAppScreen(APP_SCREENS.SIGN_IN)}
          onGoSignUp={() => setAppScreen(APP_SCREENS.SIGN_UP)}
          onSignOut={() => {
            authApi.logoutSession()
            setCurrentUser(null)
            setIsAuthenticated(false)
            setAppScreen(APP_SCREENS.LANDING)
          }}
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
      <main className="app-main">
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
