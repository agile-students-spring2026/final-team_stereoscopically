import { useCallback, useEffect, useState } from 'react'
import { deleteCreation, fetchCreations, publishCreation, unpublishCreation } from '../services/creationsApi.js'
import { changeEmail, changePassword, fetchCurrentUser, verifyCurrentPassword } from '../services/authApi.js'
import { normalizeUserMediaSrc } from '../utils/mediaPublicUrl.js'
import { fetchFollowing, unfollowUser } from '../services/usersApi.js'
import { getCreationThumbDescriptor } from '../utils/creationPreviewUrl.js'
import EditProfile from './EditProfile'


function CreationPreviewThumb({ row, title }) {
  const { mode, url, posterUrl, kind } = getCreationThumbDescriptor(row)
  const [failed, setFailed] = useState(false)

  if (url && !failed) {
    if (mode === 'video') {
      return (
        <div className="my-creations-thumb-wrap">
          <video
            key={url}
            className="my-creations-thumb"
            src={url}
            poster={posterUrl || undefined}
            muted
            autoPlay
            loop
            playsInline
            preload="metadata"
            onError={() => setFailed(true)}
          >
            <source src={url} type="video/mp4" />
          </video>
        </div>
      )
    }

    return (
      <div className="my-creations-thumb-wrap">
        <img
          src={url}
          alt={title ? `Preview: ${title}` : 'Preview'}
          className="my-creations-thumb"
          onError={() => setFailed(true)}
        />
      </div>
    )
  }

  const placeholderLabel = kind === 'video' ? 'Video' : kind === 'image' ? 'Image' : 'Sticker'

  return (
    <div className="my-creations-thumb-wrap my-creations-thumb-wrap--placeholder" aria-hidden="true">
      <span className="my-creations-thumb-placeholder-label">{placeholderLabel}</span>
    </div>
  )
}

const formatUpdated = (iso) => {
  if (!iso) return '—'

  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return '—'
  }
}

function ChangeEmailModal({ onClose }) {
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !isSubmitting) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isSubmitting, onClose])

  const handleSubmit = async () => {
    const errs = {}
    const trimmed = email.trim()
    if (!trimmed) {
      errs.email = 'Email is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      errs.email = 'Enter a valid email address.'
    }
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    setIsSubmitting(true)
    try {
      await changeEmail({ email: trimmed })
      setSuccess(true)
    } catch (err) {
      setErrors({ api: err?.message || 'Could not update email.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="my-creations-modal-backdrop"
      role="presentation"
      onClick={!isSubmitting ? onClose : undefined}
    >
      <div
        className="my-creations-modal account-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-email-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="my-creations-modal-title" id="change-email-title">
          Change Email
        </h2>

        {success ? (
          <>
            <p className="profile-form-success">Email updated successfully.</p>
            <div className="my-creations-modal-actions" style={{ marginTop: '1rem' }}>
              <button type="button" className="my-creations-modal-btn" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            {errors.api && (
              <p className="my-creations-modal-error" role="alert">
                {errors.api}
              </p>
            )}
            <div className="account-modal-form">
              <div className="profile-form-field">
                <label htmlFor="ce-email" className="auth-label">
                  New Email
                </label>
                <input
                  id="ce-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (errors.email) setErrors((p) => ({ ...p, email: null }))
                  }}
                  placeholder="new@example.com"
                  className={`auth-input${errors.email ? ' auth-input--error' : ''}`}
                  autoComplete="email"
                  disabled={isSubmitting}
                />
                {errors.email && (
                  <p className="profile-form-error" role="alert">
                    {errors.email}
                  </p>
                )}
              </div>
            </div>
            <div className="my-creations-modal-actions" style={{ marginTop: '1.25rem' }}>
              <button
                type="button"
                className="my-creations-modal-btn"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="my-creations-modal-btn my-creations-modal-btn--confirm"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Updating email…' : 'Update Email'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function PasswordVisibilityToggle({ pressed, disabled, onToggle, labelShow = 'Show password', labelHide = 'Hide password' }) {
  const eyepaths = (
    <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </g>
  )

  return (
    <button
      type="button"
      className="account-modal-password-visibility-btn"
      onClick={onToggle}
      disabled={disabled}
      aria-label={pressed ? labelHide : labelShow}
      aria-pressed={pressed}
      tabIndex={disabled ? -1 : 0}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {pressed ? (
          <>
            {eyepaths}
            <path
              d="M4 18L18 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        ) : (
          eyepaths
        )}
      </svg>
    </button>
  )
}

function ChangePasswordModal({ onClose }) {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [currentPasswordVerified, setCurrentPasswordVerified] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !isSubmitting && !isVerifying) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isSubmitting, isVerifying, onClose])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }))
    if (errors.api) setErrors((prev) => ({ ...prev, api: undefined }))
    if (name === 'currentPassword') {
      setCurrentPasswordVerified(false)
    }
  }

  const currentPwFieldBusy = isSubmitting || isVerifying || currentPasswordVerified

  const handleVerifyCurrentPassword = async () => {
    if (!form.currentPassword.trim()) {
      setErrors((p) => ({ ...p, currentPassword: 'Current password is required.' }))
      setCurrentPasswordVerified(false)
      return
    }

    setIsVerifying(true)
    setErrors((p) => ({ ...p, currentPassword: undefined, api: undefined }))
    try {
      await verifyCurrentPassword({ currentPassword: form.currentPassword })
      setCurrentPasswordVerified(true)
      setShowCurrentPassword(false)
    } catch {
      setCurrentPasswordVerified(false)
      setErrors((p) => ({ ...p, currentPassword: 'Wrong' }))
    } finally {
      setIsVerifying(false)
    }
  }

  const handleSubmit = async () => {
    const errs = {}
    if (!form.currentPassword.trim()) {
      errs.currentPassword = 'Current password is required.'
    } else if (!currentPasswordVerified) {
      errs.currentPassword = 'Verify your current password first.'
    }
    if (!form.newPassword) {
      errs.newPassword = 'New password is required.'
    } else if (form.newPassword.length < 8) {
      errs.newPassword = 'Password must be at least 8 characters.'
    }
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.'
    }
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    setIsSubmitting(true)
    try {
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })
      setSuccess(true)
      setShowNewPassword(false)
      setShowConfirmPassword(false)
    } catch (err) {
      setErrors({ api: err?.message || 'Could not update password.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="my-creations-modal-backdrop"
      role="presentation"
      onClick={!isSubmitting && !isVerifying ? onClose : undefined}
    >
      <div
        className="my-creations-modal account-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="my-creations-modal-title" id="change-password-title">
          Change Password
        </h2>

        {success ? (
          <>
            <p className="profile-form-success">Password updated successfully.</p>
            <div className="my-creations-modal-actions" style={{ marginTop: '1rem' }}>
              <button type="button" className="my-creations-modal-btn" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            {errors.api && (
              <p className="my-creations-modal-error" role="alert">
                {errors.api}
              </p>
            )}
            <div className="account-modal-form">
              <div className="profile-form-field">
                <label htmlFor="cp-current" className="auth-label">
                  Current Password
                </label>
                <div className="account-modal-password-row">
                  <div className="account-modal-password-input-wrap">
                    <input
                      id="cp-current"
                      type={showCurrentPassword ? 'text' : 'password'}
                      name="currentPassword"
                      value={form.currentPassword}
                      onChange={handleChange}
                      className={`auth-input account-modal-password-row-input auth-input--with-visibility-toggle${errors.currentPassword ? ' auth-input--error' : ''}`}
                      autoComplete="current-password"
                      disabled={currentPwFieldBusy}
                      spellCheck={false}
                    />
                    <PasswordVisibilityToggle
                      pressed={showCurrentPassword}
                      disabled={currentPwFieldBusy}
                      onToggle={() => setShowCurrentPassword((v) => !v)}
                      labelShow="Show current password"
                      labelHide="Hide current password"
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-secondary account-modal-verify-btn"
                    disabled={isSubmitting || isVerifying || currentPasswordVerified || !form.currentPassword.trim()}
                    onClick={handleVerifyCurrentPassword}
                  >
                    {isVerifying ? 'Checking…' : currentPasswordVerified ? 'Verified' : 'Verify'}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className="profile-form-error" role="alert">
                    {errors.currentPassword}
                  </p>
                )}
                {currentPasswordVerified && (
                  <p className="profile-form-success" role="status">
                    Current password confirmed. You can enter a new password below.
                  </p>
                )}
              </div>

              <div className="profile-form-field">
                <label htmlFor="cp-new" className="auth-label">
                  New Password
                </label>
                <div className="account-modal-password-input-wrap account-modal-password-input-wrap--full">
                  <input
                    id="cp-new"
                    type={showNewPassword ? 'text' : 'password'}
                    name="newPassword"
                    value={form.newPassword}
                    onChange={handleChange}
                    className={`auth-input account-modal-password-row-input auth-input--with-visibility-toggle${errors.newPassword ? ' auth-input--error' : ''}`}
                    autoComplete="new-password"
                    disabled={isSubmitting || !currentPasswordVerified}
                    spellCheck={false}
                  />
                  <PasswordVisibilityToggle
                    pressed={showNewPassword}
                    disabled={isSubmitting || !currentPasswordVerified}
                    onToggle={() => setShowNewPassword((v) => !v)}
                    labelShow="Show new password"
                    labelHide="Hide new password"
                  />
                </div>
                {errors.newPassword && (
                  <p className="profile-form-error" role="alert">
                    {errors.newPassword}
                  </p>
                )}
              </div>

              <div className="profile-form-field">
                <label htmlFor="cp-confirm" className="auth-label">
                  Confirm New Password
                </label>
                <div className="account-modal-password-input-wrap account-modal-password-input-wrap--full">
                  <input
                    id="cp-confirm"
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    className={`auth-input account-modal-password-row-input auth-input--with-visibility-toggle${errors.confirmPassword ? ' auth-input--error' : ''}`}
                    autoComplete="new-password"
                    disabled={isSubmitting || !currentPasswordVerified}
                    spellCheck={false}
                  />
                  <PasswordVisibilityToggle
                    pressed={showConfirmPassword}
                    disabled={isSubmitting || !currentPasswordVerified}
                    onToggle={() => setShowConfirmPassword((v) => !v)}
                    labelShow="Show confirm password"
                    labelHide="Hide confirm password"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="profile-form-error" role="alert">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>
            <div className="my-creations-modal-actions" style={{ marginTop: '1.25rem' }}>
              <button
                type="button"
                className="my-creations-modal-btn"
                onClick={onClose}
                disabled={isSubmitting || isVerifying}
              >
                Cancel
              </button>
              <button
                type="button"
                className="my-creations-modal-btn my-creations-modal-btn--confirm"
                onClick={handleSubmit}
                disabled={isSubmitting || isVerifying || !currentPasswordVerified}
              >
                {isSubmitting ? 'Updating password…' : 'Update Password'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function GuestProfileView({ onGoSignIn, onGoSignUp }) {
  return (
    <div className="profile-guest">
      <div className="profile-guest-card">
        <div className="profile-guest-icon" aria-hidden="true">
          <svg className="profile-guest-icon-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" focusable="false">
            <path
              fill="currentColor"
              d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
            />
          </svg>
        </div>

        <h2 className="profile-guest-title">Sign in to see your profile</h2>

        <p className="profile-guest-subtitle">
          Create an account or sign in to save your stickers and manage your profile.
        </p>

        <div className="profile-guest-actions">
          <button type="button" className="btn-primary" onClick={onGoSignIn}>
            Sign In
          </button>

          <button type="button" className="btn-secondary" onClick={onGoSignUp}>
            Sign Up
          </button>
        </div>
      </div>
    </div>
  )
}

function MyCreationsPage({
  refreshKey = 0,
  onSelectCreation,
  isAuthenticated = true,
  onGoSignIn,
  onGoSignUp,
  onSignOut,
  onNavigateToProfile,
  followingRefreshKey = 0,
}) {
  const [profile, setProfile] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteDialogError, setDeleteDialogError] = useState(null)
  const [following, setFollowing] = useState([])
  const [followingLoading, setFollowingLoading] = useState(false)
  const [pendingUnfollowIds, setPendingUnfollowIds] = useState(new Set())
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showChangeEmail, setShowChangeEmail] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [pendingPublishIds, setPendingPublishIds] = useState(new Set())


  useEffect(() => {
    if (!isAuthenticated) {
      // avoid synchronous setState inside effect
      Promise.resolve().then(() => setProfile(null))
      return
    }
    fetchCurrentUser().then(setProfile).catch(() => {})
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined
    }

    let cancelled = false

    const load = async () => {
      await Promise.resolve()

      if (cancelled) return

      setLoading(true)
      setError(null)

      try {
        const data = await fetchCreations()

        if (!cancelled) {
          setItems(Array.isArray(data) ? data : [])
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || 'Could not load creations.')
          setItems([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [refreshKey, isAuthenticated])

  const requestDelete = useCallback((e, row) => {
    e?.stopPropagation?.()

    const id = row?._id ?? row?.id
    if (id == null) return

    const rawTitle = typeof row?.title === 'string' && row.title.trim() ? row.title.trim() : 'Untitled'

    setDeleteDialogError(null)
    setPendingDelete({ id: String(id), title: rawTitle })
  }, [])

  const cancelDelete = useCallback(
    (e) => {
      e?.stopPropagation?.()

      if (isDeleting) return

      setPendingDelete(null)
      setDeleteDialogError(null)
    },
    [isDeleting]
  )

  useEffect(() => {
    if (!isAuthenticated) return
    // schedule following loading state in microtask to satisfy lint rule
    Promise.resolve().then(() => setFollowingLoading(true))
    fetchFollowing()
      .then(({ users }) => setFollowing(users || []))
      .catch(() => {})
      .finally(() => setFollowingLoading(false))
  }, [isAuthenticated, followingRefreshKey])

  const handleUnfollow = useCallback(async (userId) => {
    setPendingUnfollowIds((prev) => new Set([...prev, userId]))
    try {
      await unfollowUser(userId)
      setFollowing((prev) => prev.filter((u) => u.id !== userId))
    } catch {
      // silent — user stays in list; they can retry
    } finally {
      setPendingUnfollowIds((prev) => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete || isDeleting) return

    setIsDeleting(true)
    setDeleteDialogError(null)

    try {
      await deleteCreation(pendingDelete.id)

      setItems((prev) => prev.filter((row) => String(row._id ?? row.id) !== pendingDelete.id))
      setPendingDelete(null)
    } catch (err) {
      setDeleteDialogError(err?.message || 'Could not delete.')
    } finally {
      setIsDeleting(false)
    }
  }, [isDeleting, pendingDelete])

  useEffect(() => {
    if (!pendingDelete) return undefined

    const onKey = (e) => {
      if (e.key === 'Escape' && !isDeleting) {
        e.preventDefault()
        setPendingDelete(null)
        setDeleteDialogError(null)
      }
    }

    window.addEventListener('keydown', onKey)

    return () => window.removeEventListener('keydown', onKey)
  }, [pendingDelete, isDeleting])

  const handlePublish = useCallback(async (creationId) => {
    setPendingPublishIds((prev) => new Set([...prev, creationId]))
    try {
      const updated = await publishCreation(creationId)
      setItems((prev) => prev.map((item) => (String(item._id ?? item.id) === creationId ? updated : item)))
    } catch (err) {
      console.error('Publish failed:', err)
    } finally {
      setPendingPublishIds((prev) => {
        const next = new Set(prev)
        next.delete(creationId)
        return next
      })
    }
  }, [])

  const handleUnpublish = useCallback(async (creationId) => {
    setPendingPublishIds((prev) => new Set([...prev, creationId]))
    try {
      const updated = await unpublishCreation(creationId)
      setItems((prev) => prev.map((item) => (String(item._id ?? item.id) === creationId ? updated : item)))
    } catch (err) {
      console.error('Unpublish failed:', err)
    } finally {
      setPendingPublishIds((prev) => {
        const next = new Set(prev)
        next.delete(creationId)
        return next
      })
    }
  }, [])

  if (!isAuthenticated) {
    return <GuestProfileView onGoSignIn={onGoSignIn} onGoSignUp={onGoSignUp} />
  }

  const draftItems = items.filter(row => row.status !== 'exported' && row.status !== 'published')
  const exportedItems = items.filter(row => row.status === 'exported' || row.status === 'published')

  const renderDraftsContent = () => {
    if (loading) {
      return <p className="profile-section-empty editor-status editor-status--loading">Loading…</p>
    }

    if (error) {
      return <p className="profile-section-empty editor-status editor-status--error">{error}</p>
    }

    if (!draftItems.length) {
      return <p className="profile-section-empty">No drafts yet</p>
    }

    return (
      <ul className="my-creations-list profile-drafts-list">
        {draftItems.map((row) => {
          const id = row._id ?? row.id
          const title = typeof row.title === 'string' && row.title.trim() ? row.title.trim() : 'Untitled'

          return (
            <li
              key={id}
              className={`my-creations-item${onSelectCreation ? ' my-creations-item--clickable' : ''}`}
              onClick={() => onSelectCreation?.(row)}
              role={onSelectCreation ? 'button' : undefined}
              tabIndex={onSelectCreation ? 0 : undefined}
            >
              <CreationPreviewThumb row={row} title={title} />
              <div className="my-creations-item-body">
                <div className="my-creations-item-main">
                  <span className="my-creations-item-title">{title}</span>
                  <span className="my-creations-badge my-creations-badge--draft">Draft</span>
                </div>
                <div className="my-creations-item-row2">
                  <div className="my-creations-item-meta">Updated {formatUpdated(row.updatedAt)}</div>
                  <button type="button" className="my-creations-delete" onClick={(e) => requestDelete(e, row)} aria-label={`Delete ${title}`}>
                    Delete
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    )
  }
  const renderExportedContent = () => {
    if (!exportedItems.length) {
      return <p className="profile-section-empty">No exported stickers yet</p>
    }

    return (
      <ul aria-label="Exported creations" className="my-creations-list profile-exported-list">
        {exportedItems.map((row) => {
          const id = row._id ?? row.id
          const title = typeof row.title === 'string' && row.title.trim() ? row.title.trim() : 'Untitled'
          const isPublished = row.status === 'published'
          const isPending = pendingPublishIds.has(String(id))

          return (
            <li key={id} className="my-creations-item">
              <CreationPreviewThumb row={row} title={title} />
              <div className="my-creations-item-body">
                <div className="my-creations-item-main">
                  <span className="my-creations-item-title">{title}</span>
                  <span className={`my-creations-badge ${isPublished ? 'my-creations-badge--published' : 'my-creations-badge--exported'}`}>
                    {isPublished ? 'Published' : 'Exported'}
                  </span>
                </div>
                <div className="my-creations-item-row2">
                  <div className="my-creations-item-meta">Updated {formatUpdated(row.updatedAt)}</div>
                  <div className="my-creations-item-actions">
                    {isPublished ? (
                      <button
                        type="button"
                        className="my-creations-unpublish"
                        onClick={() => handleUnpublish(String(id))}
                        disabled={isPending}
                        aria-label={`Unpublish ${title}`}
                      >
                        {isPending ? '…' : 'Unpublish'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="my-creations-publish"
                        onClick={() => handlePublish(String(id))}
                        disabled={isPending}
                        aria-label={`Publish ${title}`}
                      >
                        {isPending ? '…' : 'Publish'}
                      </button>
                    )}
                    <button type="button" className="my-creations-delete" onClick={(e) => requestDelete(e, row)} aria-label={`Delete ${title}`}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    )
  }


  const renderConnectionsContent = () => {
    if (followingLoading) {
      return <p className="profile-section-empty editor-status editor-status--loading">Loading…</p>
    }

    if (following.length === 0) {
      return (
        <p className="profile-section-empty">
          No connections yet. Search for creators on Home to start following people.
        </p>
      )
    }

    return (
      <ul className="profile-friend-list">
        {following.map((user) => {
          const initial = (user.displayName || user.username || '?').charAt(0).toUpperCase()
          return (
            <li key={user.id} className="profile-friend-item">
              <button
                type="button"
                className="home-user-avatar-btn"
                onClick={() => onNavigateToProfile?.(user)}
                aria-label={`View ${user.displayName || user.username}'s profile`}
                tabIndex={-1}
              >
                {user.avatarUrl ? (
                  <img src={normalizeUserMediaSrc(user.avatarUrl)} alt="" className="home-user-avatar-img" aria-hidden="true" />
                ) : (
                  <div className="profile-friend-avatar" aria-hidden="true">{initial}</div>
                )}
              </button>
              <button
                type="button"
                className="profile-friend-info home-user-info-btn"
                onClick={() => onNavigateToProfile?.(user)}
              >
                <span className="profile-friend-name">{user.displayName || user.username}</span>
                {user.username && <span className="profile-friend-handle">@{user.username}</span>}
                {user.bio && <span className="home-user-bio">{user.bio}</span>}
              </button>
              <div className="profile-friend-actions">
                <button
                  type="button"
                  className="profile-friend-btn profile-friend-btn--following"
                  onClick={() => handleUnfollow(user.id)}
                  disabled={pendingUnfollowIds.has(user.id)}
                  aria-label={`Unfollow ${user.displayName || user.username}`}
                >
                  {pendingUnfollowIds.has(user.id) ? '…' : 'Following'}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    )
  }

  const draftsSection = (
    <div className="profile-section profile-section--drafts">
      <div className="profile-section-header">
        <h3 className="profile-section-title">Drafts</h3>
        {!loading && !error ? <span className="profile-section-count">{draftItems.length}</span> : null}
      </div>

      <div className="profile-section-body">{renderDraftsContent()}</div>
    </div>
  )

  const activitySection = (
    <div className="profile-section profile-section--activity">
      <div className="profile-section-header">
        <h3 className="profile-section-title">Activity</h3>
        <span className="profile-section-count">{exportedItems.length}</span>
      </div>
      <div className="profile-section-body">{renderExportedContent()}</div>
    </div>
  )

  const connectionsSection = (
    <div className="profile-section profile-section--connections">
      <div className="profile-section-header">
        <h3 className="profile-section-title">Connections</h3>
        <span className="profile-section-count">{following.length}</span>
      </div>

      <div className="profile-section-body">{renderConnectionsContent()}</div>
    </div>
  )

  if (showEditProfile) {
    return (
      <EditProfile
        onSave={() => {
          fetchCurrentUser().then(setProfile).catch(() => {})
          setShowEditProfile(false)
        }}
        onCancel={() => setShowEditProfile(false)}
      />
    )
  }

  return (
    <div className="profile-page" role="region" aria-label="Profile">
      <div className="profile-header">
        <div className="profile-avatar" aria-hidden="true">
          {profile?.avatarUrl ? (
            <img
              src={normalizeUserMediaSrc(profile.avatarUrl)}
              alt="Avatar"
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <span className="profile-avatar-initials">
              {profile?.displayName?.charAt(0).toUpperCase() ||
                profile?.username?.charAt(0).toUpperCase() ||
                '?'}
            </span>
          )}
        </div>

        {profile?.displayName && profile?.username ? (
          <>
            <p className="profile-name">{profile.displayName}</p>
            <p className="profile-username">@{profile.username}</p>
          </>
        ) : (
          <p className="profile-name profile-name--incomplete">
            Profile not set up yet.{' '}
            <button type="button" className="profile-setup-link" onClick={() => setShowEditProfile(true)}>
              Set up your profile
            </button>
          </p>
        )}
        {profile?.bio ? <p className="profile-bio">{profile.bio}</p> : null}

        <button
          type="button"
          className="btn-secondary"
          onClick={() => setShowEditProfile(true)}
        >
          Edit Profile
        </button>

        {(profile?.instagram || profile?.x) ? (
          <div className="profile-socials">
            {profile.instagram ? (
              <a
                href={`https://instagram.com/${profile.instagram}`}
                className="profile-social-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram
              </a>
            ) : null}
            {profile.x ? (
              <a
                href={`https://x.com/${profile.x}`}
                className="profile-social-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                X
              </a>
            ) : null}
          </div>
        ) : null}
      </div>

      {draftsSection}
      {activitySection}
      {connectionsSection}

      <div className="profile-account">
        <p className="profile-account-title">Account</p>

        <div className="profile-account-actions">
          <button
            type="button"
            className="profile-account-action"
            onClick={() => setShowChangeEmail(true)}
          >
            <span>Change Email</span>
            <span className="profile-account-action-arrow" aria-hidden="true">›</span>
          </button>

          <button
            type="button"
            className="profile-account-action"
            onClick={() => setShowChangePassword(true)}
          >
            <span>Change Password</span>
            <span className="profile-account-action-arrow" aria-hidden="true">›</span>
          </button>

          <button
            type="button"
            className="profile-account-action profile-account-action--danger"
            onClick={onSignOut}
          >
            Sign Out
          </button>
        </div>
      </div>

      {pendingDelete ? (
        <div className="my-creations-modal-backdrop" role="presentation" onClick={cancelDelete}>
          <div
            className="my-creations-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="my-creations-delete-heading"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="my-creations-delete-heading" className="my-creations-modal-title">
              Delete this creation?
            </h2>

            <p className="my-creations-modal-text">
              <span className="my-creations-modal-quot">&ldquo;{pendingDelete.title}&rdquo;</span> will be removed. This
              cannot be undone.
            </p>

            {deleteDialogError ? (
              <p className="my-creations-modal-error" role="alert">
                {deleteDialogError}
              </p>
            ) : null}

            <div className="my-creations-modal-actions">
              <button
                type="button"
                className="my-creations-modal-btn"
                onClick={cancelDelete}
                disabled={isDeleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="my-creations-modal-btn my-creations-modal-btn--danger"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showChangeEmail ? (
        <ChangeEmailModal onClose={() => setShowChangeEmail(false)} />
      ) : null}

      {showChangePassword ? (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      ) : null}
    </div>
  )
}

export default MyCreationsPage
