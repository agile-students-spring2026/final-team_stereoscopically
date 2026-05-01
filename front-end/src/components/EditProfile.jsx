import { useState, useEffect } from 'react'
import { getAuthToken } from '../auth/authSession'


function EditProfile({ onSave, onCancel }) {
  const [form, setForm] = useState({
    displayName: '',
    bio: '',
    avatarUrl: '',
    instagram: '',
    x: '',
  })
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [errors, setErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/me', {
          headers: { Authorization: `Bearer ${getAuthToken()}` }
        })
        if (!res.ok) throw new Error('Failed to fetch profile')
        const data = await res.json()
        setForm({
          displayName: data.displayName || '',
          bio: data.bio || '',
          avatarUrl: data.avatarUrl || '',
          instagram: data.instagram || '',
          x: data.x || '',
        })
      } catch (_err) {
        setErrors({ fetch: 'Could not load profile. Please try again.' })
      }
    }
    fetchProfile()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }))
  }

  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarPreview(URL.createObjectURL(file))
  }

  const validate = () => {
    const newErrors = {}
    if (!form.displayName.trim()) newErrors.displayName = 'Display name is required.'
    if (form.avatarUrl && !/^https?:\/\/.+/.test(form.avatarUrl)) {
      newErrors.avatarUrl = 'Avatar URL must be a valid URL.'
    }
    if (form.instagram && !/^https?:\/\/.+/.test(form.instagram)) {
      newErrors.instagram = 'Instagram URL must be a valid URL.'
    }
    if (form.x && !/^https?:\/\/.+/.test(form.x)) {
      newErrors.x = 'X URL must be a valid URL.'
    }
    return newErrors
  }

  const handleSave = async () => {
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          displayName: form.displayName,
          bio: form.bio,
          avatarUrl: form.avatarUrl,
          instagram: form.instagram,
          x: form.x,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        if (errorData.errors) {
          setErrors(errorData.errors)
        } else {
          setErrors({ api: errorData.message || 'Failed to save profile.' })
        }
        return
      }

      const updated = await res.json()
      onSave?.(updated)
    } catch (_err) {
      setErrors({ api: 'Network error. Please try again.' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="app-container">
      <div className="screen-header">
        <div className="app-logo">StickerCreate</div>
        <h2 className="screen-title">Edit Profile</h2>
      </div>

      <div className="card">
        {errors.fetch && <p className="error-text">{errors.fetch}</p>}
        {errors.api && <p className="error-text">{errors.api}</p>}

        <div className="form-group">
          {avatarPreview && (
            <img
              src={avatarPreview}
              alt="Avatar preview"
              style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', marginBottom: 8 }}
            />
          )}
          <label>Avatar</label>
          <label htmlFor="avatar-upload" className="upload-button" style={{ cursor: 'pointer' }}>
            Upload File
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            className="hidden-file-input"
            onChange={handleAvatarFileChange}
          />
        </div>

        <div className="form-group">
          <label>Avatar URL</label>
          <input
            type="text"
            name="avatarUrl"
            value={form.avatarUrl}
            onChange={handleChange}
            placeholder="https://example.com/avatar.png"
            className="text-input"
          />
          {errors.avatarUrl && <p className="error-text">{errors.avatarUrl}</p>}
        </div>

        <div className="form-group">
          <label>Display Name *</label>
          <input
            type="text"
            name="displayName"
            value={form.displayName}
            onChange={handleChange}
            placeholder="Your name"
            className="text-input"
          />
          {errors.displayName && <p className="error-text">{errors.displayName}</p>}
        </div>

        <div className="form-group">
          <label>Bio</label>
          <textarea
            name="bio"
            value={form.bio}
            onChange={handleChange}
            placeholder="Tell us about yourself"
            className="text-input"
            rows={3}
          />
        </div>

        <div className="form-group">
          <label>Instagram URL</label>
          <input
            type="text"
            name="instagram"
            value={form.instagram}
            onChange={handleChange}
            placeholder="https://instagram.com/yourhandle"
            className="text-input"
          />
          {errors.instagram && <p className="error-text">{errors.instagram}</p>}
        </div>

        <div className="form-group">
          <label>X (Twitter) URL</label>
          <input
            type="text"
            name="x"
            value={form.x}
            onChange={handleChange}
            placeholder="https://x.com/yourhandle"
            className="text-input"
          />
          {errors.x && <p className="error-text">{errors.x}</p>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'center' }}>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}

export default EditProfile
