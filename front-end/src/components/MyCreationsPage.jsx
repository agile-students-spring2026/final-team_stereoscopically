import { useCallback, useEffect, useState } from 'react'
import { deleteCreation, fetchCreations } from '../services/creationsApi.js'
import { changeEmail, changePassword, fetchCurrentUser } from '../services/authApi.js'
import { fetchFollowing, unfollowUser } from '../services/usersApi.js'
import { getCreationKindLabel, getCreationPreviewUrl } from '../utils/creationPreviewUrl.js'
import EditProfile from './EditProfile'


function CreationPreviewThumb({ row, title }) {
  const url = getCreationPreviewUrl(row)
  const kind = getCreationKindLabel(row)
  const [failed, setFailed] = useState(false)

  if (url && !failed) {
    if (kind === 'video') {
      return (
        <div className="my-creations-thumb-wrap">
          <video
            src={url}
            className="my-creations-thumb"
            muted
            autoPlay
            loop
            playsInline
            preload="metadata"
            onError={() => setFailed(true)}
          />
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
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
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

function ChangePasswordModal({ onClose }) {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
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

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
    if (errors[name]) setErrors((p) => ({ ...p, [name]: null }))
  }

  const handleSubmit = async () => {
    const errs = {}
    if (!form.currentPassword) errs.currentPassword = 'Current password is required.'
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
      onClick={!isSubmitting ? onClose : undefined}
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
                <input
                  id="cp-current"
                  type="password"
                  name="currentPassword"
                  value={form.currentPassword}
                  onChange={handleChange}
                  className={`auth-input${errors.currentPassword ? ' auth-input--error' : ''}`}
                  autoComplete="current-password"
                  disabled={isSubmitting}
                />
                {errors.currentPassword && (
                  <p className="profile-form-error" role="alert">
                    {errors.currentPassword}
                  </p>
                )}
              </div>

              <div className="profile-form-field">
                <label htmlFor="cp-new" className="auth-label">
                  New Password
                </label>
                <input
                  id="cp-new"
                  type="password"
                  name="newPassword"
                  value={form.newPassword}
                  onChange={handleChange}
                  className={`auth-input${errors.newPassword ? ' auth-input--error' : ''}`}
                  autoComplete="new-password"
                  disabled={isSubmitting}
                />
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
                <input
                  id="cp-confirm"
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className={`auth-input${errors.confirmPassword ? ' auth-input--error' : ''}`}
                  autoComplete="new-password"
                  disabled={isSubmitting}
                />
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
          <span className="profile-guest-icon-glyph">○</span>
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


  useEffect(() => {
    if (!isAuthenticated) {
      setProfile(null)
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
    setFollowingLoading(true)
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

  if (!isAuthenticated) {
    return <GuestProfileView onGoSignIn={onGoSignIn} onGoSignUp={onGoSignUp} />
  }

  const draftItems = items.filter(row => row.status !== 'exported')
  const exportedItems = items.filter(row => row.status === 'exported')

  const renderDraftsContent = () => {
    if (loading) {
      return <p className="profile-section-empty editor-status editor-status--loading">Loading…</p>
    }

    if (error) {
      return <p className="profile-section-empty editor-status editor-status--error">{error}</p>
    }

    if (!draftItems.length) {
      return (
        <>
          <p className="profile-section-empty">No saved stickers yet.</p>
          <p className="profile-section-empty">No drafts yet</p>
        </>
      )
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
      return <p className="profile-section-empty profile-section-empty--compact">No exported stickers yet</p>
    }

    return (
      <ul aria-label="Exported creations">
        {exportedItems.map((row) => {
          const id = row._id ?? row.id
          const title = typeof row.title === 'string' && row.title.trim() ? row.title.trim() : 'Untitled'

          return (
            <li key={id} className="my-creations-item">
              <CreationPreviewThumb row={row} title={title} />
              <div className="my-creations-item-body">
                <div className="my-creations-item-main">
                  <span className="my-creations-item-title">{title}</span>
                  <span className="my-creations-badge my-creations-badge--exported">Exported</span>
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


  const renderConnectionsContent = () => {
    if (followingLoading) {
      return <p className="profile-section-empty editor-status editor-status--loading">Loading…</p>
    }

    if (following.length === 0) {
      return (
        <>
          <p className="profile-section-empty">No connections yet.</p>
          <p className="profile-section-empty">Search for creators on Home to start following people.</p>
        </>
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
                  <img src={user.avatarUrl} alt="" className="home-user-avatar-img" aria-hidden="true" />
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
        <span className="profile-section-count">{totalConnections}</span>
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
              src={profile.avatarUrl}
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
      {showConnectionsBeforeActivity ? connectionsSection : activitySection}
      {showConnectionsBeforeActivity ? activitySection : connectionsSection}

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
