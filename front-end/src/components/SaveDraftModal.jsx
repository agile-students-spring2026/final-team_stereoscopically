import { useState, useEffect } from 'react'

function SaveDraftModal({ currentTitle, onConfirm, onCancel, isSaving, saveError }) {
  const [name, setName] = useState(currentTitle || '')

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape' && !isSaving) onCancel() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isSaving, onCancel])

  return (
    <div
      className="my-creations-modal-backdrop"
      onClick={!isSaving ? onCancel : undefined}
      role="dialog"
      aria-modal="true"
      aria-label="Save draft"
    >
      <div className="my-creations-modal save-draft-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="my-creations-modal-title">Save draft</h3>
        <div className="save-draft-modal-field">
          <label htmlFor="save-draft-name" className="save-draft-modal-label">
            Draft name
          </label>
          <input
            id="save-draft-name"
            type="text"
            className="auth-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Untitled draft"
            maxLength={200}
            disabled={isSaving}
            autoFocus
            autoComplete="off"
          />
        </div>
        {saveError && (
          <p className="profile-form-error" role="alert" style={{ marginTop: '0.5rem' }}>
            {saveError}
          </p>
        )}
        <div className="my-creations-modal-actions">
          <button
            type="button"
            className="my-creations-modal-btn"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="my-creations-modal-btn my-creations-modal-btn--confirm"
            onClick={() => onConfirm(name)}
            disabled={isSaving}
          >
            {isSaving ? 'Saving draft…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SaveDraftModal
