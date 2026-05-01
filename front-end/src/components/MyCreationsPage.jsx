import { useCallback, useEffect, useMemo, useState } from 'react'
import { deleteCreation, fetchCreations } from '../services/creationsApi.js'
import { getCreationKindLabel, getCreationPreviewUrl } from '../utils/creationPreviewUrl.js'
import * as authApi from '../services/authApi.js'

function CreationPreviewThumb({ row, title }) {
  const url = getCreationPreviewUrl(row)
  const kind = getCreationKindLabel(row)
  const [failed, setFailed] = useState(false)
  const hasExportAsset =
    typeof row?.exportAssetId === 'string' ? Boolean(row.exportAssetId.trim()) : false

  if (url && !failed) {
    if (kind === 'video' && !hasExportAsset) {
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
    return d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return '—'
  }
}

const profileDisplayName = (user) => {
  const d = user?.displayName?.trim()
  if (d) return d
  const e = user?.email?.trim()
  if (e) return e
  return 'Your Name'
}

const profileBioText = (user) => {
  const b = user?.bio?.trim()
  if (b) return b
  return 'No bio yet.'
}

const profileInitials = (user) => {
  const dn = user?.displayName?.trim()
  if (dn) {
    const parts = dn.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2)
    if (parts[0]) return parts[0].slice(0, 2).toUpperCase()
  }
  const em = user?.email?.trim()
  if (em) return em.slice(0, 2).toUpperCase()
  return 'SC'
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
  currentUser = null,
  onGoSignIn,
  onGoSignUp,
  onSignOut,
  onCurrentUserUpdated,
}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteDialogError, setDeleteDialogError] = useState(null)
  const [friendRequests, setFriendRequests] = useState([])
  const [friends, setFriends] = useState([])
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [nextEmail, setNextEmail] = useState('')
  const [emailSubmitting, setEmailSubmitting] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [emailSuccess, setEmailSuccess] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [isCurrentPasswordVerified, setIsCurrentPasswordVerified] = useState(false)
  const [currentPasswordVerifying, setCurrentPasswordVerifying] = useState(false)
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  useEffect(() => {
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

  const handleAcceptRequest = useCallback((id) => {
    const req = friendRequests.find((r) => r.id === id)
    if (req) {
      setFriends((prev) => [...prev, req])
    }
    setFriendRequests((prev) => prev.filter((r) => r.id !== id))
  }, [friendRequests])

  const handleDeclineRequest = useCallback((id) => {
    setFriendRequests((prev) => prev.filter((r) => r.id !== id))
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

  const showConnectionsBeforeActivity = friendRequests.length > 0

  const totalConnections = useMemo(
    () => friendRequests.length + friends.length,
    [friendRequests.length, friends.length]
  )

  const exportedCreations = useMemo(
    () =>
      Array.isArray(items)
        ? items.filter((row) => row.status === 'exported')
        : [],
    [items]
  )

  const draftItems = useMemo(
    () =>
      Array.isArray(items)
        ? items.filter((row) => row.status !== 'exported')
        : [],
    [items]
  )

  const toggleEmailForm = useCallback(() => {
    setShowEmailForm((prev) => {
      const next = !prev
      if (next) {
        setNextEmail(currentUser?.email || '')
        setEmailError('')
        setEmailSuccess('')
      }
      return next
    })
  }, [currentUser?.email])

  const togglePasswordForm = useCallback(() => {
    setShowPasswordForm((prev) => {
      const next = !prev
      if (next) {
        setCurrentPassword('')
        setNewPassword('')
        setShowCurrentPassword(false)
        setShowNewPassword(false)
        setIsCurrentPasswordVerified(false)
        setCurrentPasswordVerifying(false)
        setPasswordError('')
        setPasswordSuccess('')
      }
      return next
    })
  }, [])

  const handleChangeEmail = useCallback(
    async (e) => {
      e.preventDefault()
      if (emailSubmitting) return

      setEmailSubmitting(true)
      setEmailError('')
      setEmailSuccess('')
      try {
        const updated = await authApi.changeEmail({ email: nextEmail })
        onCurrentUserUpdated?.(updated)
        setEmailSuccess('Email updated successfully.')
      } catch (err) {
        setEmailError(err?.message || 'Could not change email.')
      } finally {
        setEmailSubmitting(false)
      }
    },
    [emailSubmitting, nextEmail, onCurrentUserUpdated]
  )

  const handleChangePassword = useCallback(
    async (e) => {
      e.preventDefault()
      if (passwordSubmitting) return
      if (!isCurrentPasswordVerified) {
        setPasswordError('Please verify your current password first.')
        return
      }

      setPasswordSubmitting(true)
      setPasswordError('')
      setPasswordSuccess('')
      try {
        const response = await authApi.changePassword({ currentPassword, newPassword })
        setCurrentPassword('')
        setNewPassword('')
        setPasswordSuccess(response?.message || 'Password updated successfully.')
      } catch (err) {
        setPasswordError(err?.message || 'Could not change password.')
      } finally {
        setPasswordSubmitting(false)
      }
    },
    [currentPassword, isCurrentPasswordVerified, newPassword, passwordSubmitting]
  )

  const handleVerifyCurrentPassword = useCallback(async () => {
    if (currentPasswordVerifying) return

    setCurrentPasswordVerifying(true)
    setPasswordError('')
    setPasswordSuccess('')
    try {
      await authApi.verifyCurrentPassword({ currentPassword })
      setIsCurrentPasswordVerified(true)
      setPasswordSuccess('Current password verified.')
    } catch (err) {
      setIsCurrentPasswordVerified(false)
      setPasswordError(err?.message || 'Current password is incorrect.')
    } finally {
      setCurrentPasswordVerifying(false)
    }
  }, [currentPassword, currentPasswordVerifying])

  const renderDraftsContent = () => {
    if (loading) {
      return <p className="profile-section-empty editor-status editor-status--loading">Loading…</p>
    }

    if (error) {
      return <p className="profile-section-empty editor-status editor-status--error">{error}</p>
    }

    if (!items.length) {
      return <p className="profile-section-empty">No saved stickers yet.</p>
    }

    if (!draftItems.length) {
      return (
        <p className="profile-section-empty">
          No drafts yet. Exported stickers are under Activity.
        </p>
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
              className={`my-creations-item my-creations-item--drafts${onSelectCreation ? ' my-creations-item--clickable' : ''}`}
              onClick={() => onSelectCreation?.(row)}
              role={onSelectCreation ? 'button' : undefined}
              tabIndex={onSelectCreation ? 0 : undefined}
              onKeyDown={
                onSelectCreation
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onSelectCreation(row)
                      }
                    }
                  : undefined
              }
            >
              <div className="my-creations-item-draft-main">
                <CreationPreviewThumb row={row} title={title} />

                <div className="my-creations-item-body">
                  <div className="my-creations-item-main">
                    {onSelectCreation ? (
                      <button
                        type="button"
                        className="my-creations-item-title my-creations-item-title--link"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectCreation(row)
                        }}
                      >
                        {title}
                      </button>
                    ) : (
                      <span className="my-creations-item-title">{title}</span>
                    )}
                  </div>

                  <div className="my-creations-item-row2 my-creations-item-row2--single">
                    <div className="my-creations-item-meta">Updated {formatUpdated(row.updatedAt)}</div>
                  </div>
                </div>
              </div>

              <div className="my-creations-item-footer">
                <button
                  type="button"
                  className="my-creations-delete"
                  onClick={(e) => requestDelete(e, row)}
                  aria-label={`Delete ${title}`}
                >
                  Delete
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    )
  }

  const renderConnectionsContent = () => {
    if (friendRequests.length === 0 && friends.length === 0) {
      return <p className="profile-section-empty">No connections yet.</p>
    }

    return (
      <div className="profile-connections">
        <div className="profile-connections-block">
          <div className="profile-connections-subheader">
            <h4 className="profile-connections-subtitle">Friend Requests</h4>
            <span className="profile-connections-subcount">{friendRequests.length}</span>
          </div>

          {friendRequests.length === 0 ? (
            <p className="profile-section-empty profile-section-empty--compact">
              No incoming friend requests.
            </p>
          ) : (
            <ul className="profile-friend-list">
              {friendRequests.map((req) => (
                <li key={req.id} className="profile-friend-item">
                  <div className="profile-friend-avatar" aria-hidden="true">
                    {req.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="profile-friend-info">
                    <span className="profile-friend-name">{req.name}</span>
                    {req.handle ? <span className="profile-friend-handle">{req.handle}</span> : null}
                  </div>

                  <div className="profile-friend-actions">
                    <button
                      type="button"
                      className="profile-friend-btn profile-friend-btn--accept"
                      onClick={() => handleAcceptRequest(req.id)}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="profile-friend-btn profile-friend-btn--decline"
                      onClick={() => handleDeclineRequest(req.id)}
                    >
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="profile-connections-block">
          <div className="profile-connections-subheader">
            <h4 className="profile-connections-subtitle">Friends</h4>
            <span className="profile-connections-subcount">{friends.length}</span>
          </div>

          {friends.length === 0 ? (
            <p className="profile-section-empty profile-section-empty--compact">No friends yet.</p>
          ) : (
            <ul className="profile-friend-list">
              {friends.map((friend) => (
                <li key={friend.id} className="profile-friend-item">
                  <div className="profile-friend-avatar" aria-hidden="true">
                    {friend.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="profile-friend-info">
                    <span className="profile-friend-name">{friend.name}</span>
                    {friend.handle ? <span className="profile-friend-handle">{friend.handle}</span> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    )
  }

  const renderActivityCreationsBody = () => {
    if (loading) {
      return <p className="profile-section-empty profile-section-empty--compact editor-status editor-status--loading">Loading…</p>
    }
    if (error) {
      return <p className="profile-section-empty profile-section-empty--compact editor-status editor-status--error">{error}</p>
    }
    if (!exportedCreations.length) {
      return (
        <p className="profile-section-empty profile-section-empty--compact">
          No exported stickers yet. Export from the editor to see them here.
        </p>
      )
    }
    return (
      <ul className="profile-activity-exports-list" aria-label="Exported creations">
        {exportedCreations.map((row) => {
          const id = row._id ?? row.id
          const title = typeof row.title === 'string' && row.title.trim() ? row.title.trim() : 'Untitled'

          const rowBody = (
            <>
              <div className="profile-activity-export-thumb">
                <CreationPreviewThumb row={row} title={title} />
              </div>
              <div className="profile-activity-export-meta">
                <span className="profile-activity-export-title">{title}</span>
                <span className="profile-activity-export-updated">{formatUpdated(row.updatedAt)}</span>
              </div>
            </>
          )

          return (
            <li key={id} className="profile-activity-export-row">
              <div className="profile-activity-export-stack">
                {onSelectCreation ? (
                  <button
                    type="button"
                    className="profile-activity-export-button"
                    onClick={() => onSelectCreation(row)}
                  >
                    {rowBody}
                  </button>
                ) : (
                  <div className="profile-activity-export-static">{rowBody}</div>
                )}
                <div className="profile-activity-export-footer">
                  <button
                    type="button"
                    className="my-creations-delete"
                    onClick={(e) => requestDelete(e, row)}
                    aria-label={`Delete ${title}`}
                  >
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

  const renderActivityContent = () => (
    <div className="profile-activity-grid">
      <div className="profile-activity-card profile-activity-card--creations">
        <div className="profile-activity-card-header">
          <h4 className="profile-activity-card-title">Creations</h4>
          <span className="profile-activity-card-count">{loading || error ? '—' : exportedCreations.length}</span>
        </div>
        {renderActivityCreationsBody()}
      </div>

      <div className="profile-activity-card">
        <div className="profile-activity-card-header">
          <h4 className="profile-activity-card-title">Likes</h4>
          <span className="profile-activity-card-count">0</span>
        </div>
        <p className="profile-section-empty profile-section-empty--compact">
          Stickers you like will appear here.
        </p>
      </div>
    </div>
  )

  const draftsSection = (
    <div className="profile-section profile-section--drafts">
      <div className="profile-section-header">
        <h3 className="profile-section-title">
          {isAuthenticated ? 'Drafts' : 'Drafts on this browser'}
        </h3>
        {!loading && !error ? (
          <span className="profile-section-count">{draftItems.length}</span>
        ) : null}
      </div>

      {!isAuthenticated ? (
        <p className="profile-guest-drafts-hint">
          Saved locally for this browser. Sign in to keep creations on your account.
        </p>
      ) : null}

      <div className="profile-section-body">{renderDraftsContent()}</div>
    </div>
  )

  const activitySectionCount = loading || error ? null : exportedCreations.length

  const activitySection = (
    <div className="profile-section profile-section--activity">
      <div className="profile-section-header">
        <h3 className="profile-section-title">Activity</h3>
        {activitySectionCount !== null ? (
          <span className="profile-section-count">{activitySectionCount}</span>
        ) : null}
      </div>

      <div className="profile-section-body">{renderActivityContent()}</div>
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

  return (
    <div className="profile-page" role="region" aria-label="Profile">
      {!isAuthenticated ? (
        <GuestProfileView onGoSignIn={onGoSignIn} onGoSignUp={onGoSignUp} />
      ) : (
        <div className="profile-header">
          <div className="profile-avatar" aria-hidden="true">
            <span className="profile-avatar-initials">{profileInitials(currentUser)}</span>
          </div>

          <p className="profile-name">{profileDisplayName(currentUser)}</p>
          <p className="profile-bio">{profileBioText(currentUser)}</p>

          <div className="profile-socials">
            <button type="button" className="profile-social-link">
              Instagram
            </button>

            <button type="button" className="profile-social-link">
              Twitter
            </button>
          </div>
        </div>
      )}

      {draftsSection}

      {isAuthenticated ? (
        <>
          {showConnectionsBeforeActivity ? connectionsSection : activitySection}
          {showConnectionsBeforeActivity ? activitySection : connectionsSection}

          <div className="profile-account">
            <p className="profile-account-title">Account</p>

            <div className="profile-account-actions">
              <button type="button" className="profile-account-action" onClick={toggleEmailForm}>
                <span>Change Email</span>
                <span className="profile-account-action-arrow" aria-hidden="true">
                  ›
                </span>
              </button>
              {showEmailForm ? (
                <form className="auth-form profile-account-form" onSubmit={handleChangeEmail}>
                  {emailError ? <p className="editor-status editor-status--error">{emailError}</p> : null}
                  {emailSuccess ? (
                    <p className="editor-status editor-status--success">{emailSuccess}</p>
                  ) : null}
                  <div className="auth-field">
                    <label htmlFor="profile-change-email" className="auth-label">
                      New email
                    </label>
                    <input
                      id="profile-change-email"
                      type="email"
                      className="auth-input"
                      value={nextEmail}
                      onChange={(e) => setNextEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                  <button type="submit" className="btn-primary" disabled={emailSubmitting}>
                    {emailSubmitting ? 'Updating…' : 'Update Email'}
                  </button>
                </form>
              ) : null}

              <button type="button" className="profile-account-action" onClick={togglePasswordForm}>
                <span>Change Password</span>
                <span className="profile-account-action-arrow" aria-hidden="true">
                  ›
                </span>
              </button>
              {showPasswordForm ? (
                <form className="auth-form profile-account-form" onSubmit={handleChangePassword}>
                  {passwordError ? (
                    <p className="editor-status editor-status--error">{passwordError}</p>
                  ) : null}
                  {passwordSuccess ? (
                    <p className="editor-status editor-status--success">{passwordSuccess}</p>
                  ) : null}
                  <div className="auth-field">
                    <label htmlFor="profile-current-password" className="auth-label">
                      Current password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="profile-current-password"
                        type={showCurrentPassword ? 'text' : 'password'}
                        className="auth-input"
                        value={currentPassword}
                        onChange={(e) => {
                          setCurrentPassword(e.target.value)
                          setIsCurrentPasswordVerified(false)
                          setPasswordSuccess('')
                        }}
                        autoComplete="current-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword((prev) => !prev)}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                        aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                      >
                        {showCurrentPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={!currentPassword || currentPasswordVerifying}
                    onClick={handleVerifyCurrentPassword}
                  >
                    {currentPasswordVerifying
                      ? 'Verifying…'
                      : isCurrentPasswordVerified
                        ? 'Verified'
                        : 'Verify Current Password'}
                  </button>
                  {isCurrentPasswordVerified ? (
                    <>
                      <div className="auth-field">
                        <label htmlFor="profile-new-password" className="auth-label">
                          New password
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            id="profile-new-password"
                            type={showNewPassword ? 'text' : 'password'}
                            className="auth-input"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            autoComplete="new-password"
                            minLength={8}
                            maxLength={128}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword((prev) => !prev)}
                            style={{
                              position: 'absolute',
                              right: '10px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                            aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                          >
                            {showNewPassword ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </div>
                      <button type="submit" className="btn-primary" disabled={passwordSubmitting}>
                        {passwordSubmitting ? 'Updating…' : 'Update Password'}
                      </button>
                    </>
                  ) : null}
                </form>
              ) : null}

              <button
                type="button"
                className="profile-account-action profile-account-action--danger"
                onClick={onSignOut}
              >
                Sign Out
              </button>
            </div>
          </div>
        </>
      ) : null}

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
    </div>
  )
}

export default MyCreationsPage