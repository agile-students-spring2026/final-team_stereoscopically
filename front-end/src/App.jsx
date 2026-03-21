import { useState } from 'react'
import './App.css'
import EditorContainer from './components/EditorContainer'

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">StickerCreate</h1>
      </header>
      <main className="app-main">
        <EditorContainer />
      </main>
    </div>
  )
}

export default App
