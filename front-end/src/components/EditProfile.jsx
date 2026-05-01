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
        // form stays empty on load failure
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
    <div className="edit-profile-screen">
      <div className="auth-card edit-profile-card">
        <div className="edit-profile-header">
          <button type="button" className="auth-back-btn" onClick={onCancel} disabled={isSaving}>
            ← Back
          </button>
          <h2 className="auth-card-title">
            {isSetupMode ? 'Set Up Profile' : 'Edit Profile'}
          </h2>
        </div>

        {errors.api && (
          <p className="profile-form-alert" role="alert">
            {errors.api}
          </p>
        )}

        <div className="auth-form">
          <div className="profile-form-field">
            <span className="auth-label">Avatar</span>
            {avatarSrc && (
              <img
                src={avatarSrc}
                alt="Avatar preview"
                className="edit-profile-avatar-preview"
              />
            )}
            <label htmlFor="avatar-upload" className="btn-secondary edit-profile-upload-btn">
              {avatarSrc ? 'Change Photo' : 'Upload Photo'}
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden-file-input"
              onChange={handleAvatarFileChange}
            />
            {errors.avatar && (
              <p className="profile-form-error" role="alert">
                {errors.avatar}
              </p>
            )}
          </div>

          <div className="profile-form-field">
            <label htmlFor="ep-displayName" className="auth-label">
              Display Name{' '}
              <span className="profile-form-required" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="ep-displayName"
              type="text"
              name="displayName"
              value={form.displayName}
              onChange={handleChange}
              placeholder="Your name"
              className={`auth-input${errors.displayName ? ' auth-input--error' : ''}`}
            />
            {errors.displayName && (
              <p className="profile-form-error" role="alert">
                {errors.displayName}
              </p>
            )}
          </div>

          <div className="profile-form-field">
            <label htmlFor="ep-username" className="auth-label">
              Username{' '}
              <span className="profile-form-required" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="ep-username"
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              onBlur={handleUsernameBlur}
              placeholder="yourhandle"
              className={`auth-input${errors.username ? ' auth-input--error' : ''}`}
              autoCapitalize="none"
              autoCorrect="off"
            />
            {errors.username && (
              <p className="profile-form-error" role="alert">
                {errors.username}
              </p>
            )}
          </div>

          <div className="profile-form-field">
            <label htmlFor="ep-bio" className="auth-label">
              Bio
            </label>
            <textarea
              id="ep-bio"
              name="bio"
              value={form.bio}
              onChange={handleChange}
              placeholder="Tell us about yourself"
              className="auth-input edit-profile-bio"
              rows={3}
            />
          </div>

          <div className="profile-form-field">
            <label htmlFor="ep-instagram" className="auth-label">
              Instagram
            </label>
            <input
              id="ep-instagram"
              type="text"
              name="instagram"
              value={form.instagram}
              onChange={handleChange}
              onBlur={handleHandleBlur('instagram')}
              placeholder="yourhandle"
              className={`auth-input${errors.instagram ? ' auth-input--error' : ''}`}
              autoCapitalize="none"
              autoCorrect="off"
            />
            {errors.instagram && (
              <p className="profile-form-error" role="alert">
                {errors.instagram}
              </p>
            )}
          </div>

          <div className="profile-form-field">
            <label htmlFor="ep-x" className="auth-label">
              X / Twitter
            </label>
            <input
              id="ep-x"
              type="text"
              name="x"
              value={form.x}
              onChange={handleChange}
              onBlur={handleHandleBlur('x')}
              placeholder="yourhandle"
              className={`auth-input${errors.x ? ' auth-input--error' : ''}`}
              autoCapitalize="none"
              autoCorrect="off"
            />
            {errors.x && (
              <p className="profile-form-error" role="alert">
                {errors.x}
              </p>
            )}
          </div>
        </div>

        <div className="edit-profile-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving profile…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditProfile
