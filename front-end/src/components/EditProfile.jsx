import { useState, useEffect } from 'react'
import { fetchCurrentUser, updateProfile, uploadAvatar } from '../services/authApi'

const normalizeUsername = (v) => v.trim().toLowerCase().replace(/^@/, '')

const normalizeHandle = (v) =>
  v
    .trim()
    .replace(/^@/, '')
    .replace(/^https?:\/\/(www\.)?(instagram|twitter|x)\.com\//i, '')
    .split(/[/?#]/)[0]
    .trim()

const USERNAME_RE = /^[a-z0-9_.]+$/

function EditProfile({ onSave, onCancel }) {
  const [form, setForm] = useState({
    displayName: '',
    username: '',
    bio: '',
    instagram: '',
    x: '',
  })
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [errors, setErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await fetchCurrentUser()
        if (!data) return
        setForm({
          displayName: data.displayName || '',
          username: data.username || '',
          bio: data.bio || '',
          instagram: data.instagram || '',
          x: data.x || '',
        })
        setCurrentAvatarUrl(data.avatarUrl || '')
      } catch {
        setErrors({ fetch: 'Could not load profile. Please try again.' })
      }
    }
    fetchProfile()
  }, [])

  const isSetupMode = !form.displayName.trim() || !form.username.trim()

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }))
  }

  const handleUsernameBlur = () => {
    setForm((prev) => ({ ...prev, username: normalizeUsername(prev.username) }))
  }

  const handleHandleBlur = (field) => () => {
    setForm((prev) => ({ ...prev, [field]: normalizeHandle(prev[field]) }))
  }

  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    if (errors.avatar) setErrors((prev) => ({ ...prev, avatar: null }))
  }

  const validate = () => {
    const errs = {}
    if (!form.displayName.trim()) errs.displayName = 'Display name is required.'
    const normalizedUsername = normalizeUsername(form.username)
    if (!normalizedUsername) {
      errs.username = 'Username is required.'
    } else if (normalizedUsername.length < 3 || normalizedUsername.length > 30) {
      errs.username = 'Username must be 3–30 characters.'
    } else if (!USERNAME_RE.test(normalizedUsername)) {
      errs.username = 'Username may only contain letters, numbers, underscores, and periods.'
    }
    if (form.instagram && normalizeHandle(form.instagram).length > 50) {
      errs.instagram = 'Instagram handle too long.'
    }
    if (form.x && normalizeHandle(form.x).length > 50) {
      errs.x = 'X handle too long.'
    }
    return errs
  }

  const handleSave = async () => {
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsSaving(true)
    try {
      let avatarUrl
      if (avatarFile) {
        try {
          const result = await uploadAvatar(avatarFile)
          avatarUrl = result?.url
        } catch (err) {
          setErrors({ avatar: err?.message || 'Avatar upload failed.' })
          return
        }
      }

      const payload = {
        displayName: form.displayName.trim(),
        username: normalizeUsername(form.username),
        bio: form.bio.trim(),
        instagram: normalizeHandle(form.instagram),
        x: normalizeHandle(form.x),
      }
      if (avatarUrl) payload.avatarUrl = avatarUrl

      await updateProfile(payload)
      onSave?.()
    } catch (err) {
      setErrors({ api: err?.message || 'Failed to save profile.' })
    } finally {
      setIsSaving(false)
    }
  }

  const avatarSrc = avatarPreview || currentAvatarUrl || null

  return (
    <div className="app-container">
      <div className="screen-header">
        <div className="app-logo">StickerCreate</div>
        <h2 className="screen-title">{isSetupMode ? 'Set Up Profile' : 'Edit Profile'}</h2>
      </div>

      <div className="card">
        {errors.fetch && <p className="error-text">{errors.fetch}</p>}
        {errors.api && <p className="error-text">{errors.api}</p>}

        <div className="form-group">
          <label>Avatar</label>
          {avatarSrc && (
            <img
              src={avatarSrc}
              alt="Avatar preview"
              style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', marginBottom: 8 }}
            />
          )}
          <label htmlFor="avatar-upload" className="upload-button" style={{ cursor: 'pointer' }}>
            {avatarSrc ? 'Change Photo' : 'Upload Photo'}
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            className="hidden-file-input"
            onChange={handleAvatarFileChange}
          />
          {errors.avatar && <p className="error-text">{errors.avatar}</p>}
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
          <label>Username *</label>
          <input
            type="text"
            name="username"
            value={form.username}
            onChange={handleChange}
            onBlur={handleUsernameBlur}
            placeholder="yourhandle"
            className="text-input"
            autoCapitalize="none"
            autoCorrect="off"
          />
          {errors.username && <p className="error-text">{errors.username}</p>}
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
          <label>Instagram</label>
          <input
            type="text"
            name="instagram"
            value={form.instagram}
            onChange={handleChange}
            onBlur={handleHandleBlur('instagram')}
            placeholder="yourhandle"
            className="text-input"
            autoCapitalize="none"
            autoCorrect="off"
          />
          {errors.instagram && <p className="error-text">{errors.instagram}</p>}
        </div>

        <div className="form-group">
          <label>X / Twitter</label>
          <input
            type="text"
            name="x"
            value={form.x}
            onChange={handleChange}
            onBlur={handleHandleBlur('x')}
            placeholder="yourhandle"
            className="text-input"
            autoCapitalize="none"
            autoCorrect="off"
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
