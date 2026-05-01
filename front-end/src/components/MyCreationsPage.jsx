import { useCallback, useEffect, useMemo, useState } from 'react'
import { deleteCreation, fetchCreations } from '../services/creationsApi.js'
import { getCreationKindLabel, getCreationPreviewUrl } from '../utils/creationPreviewUrl.js'
import { getOrCreateOwnerKey } from '../utils/ownerKey.js'
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
}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteDialogError, setDeleteDialogError] = useState(null)
  const [friendRequests, setFriendRequests] = useState([])
  const [friends, setFriends] = useState([])
  const [showEditProfile, setShowEditProfile] = useState(false)


  useEffect(() => {
    if (!isAuthenticated) {
      return undefined
    }

    let cancelled = false
    const ownerKey = getOrCreateOwnerKey()

    const load = async () => {
      await Promise.resolve()

      if (cancelled) return

      setLoading(true)
      setError(null)

      try {
        const data = await fetchCreations(ownerKey)

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

  if (!isAuthenticated) {
    return <GuestProfileView onGoSignIn={onGoSignIn} onGoSignUp={onGoSignUp} />
  }

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

    return (
      <ul className="my-creations-list profile-drafts-list">
        {items.map((row) => {
          const id = row._id ?? row.id
          const title = typeof row.title === 'string' && row.title.trim() ? row.title.trim() : 'Untitled'
          const status = row.status === 'exported' ? 'exported' : 'draft'

          return (
            <li
              key={id}
              className={`my-creations-item${onSelectCreation ? ' my-creations-item--clickable' : ''}`}
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

                  <span
                    className={
                      status === 'exported'
                        ? 'my-creations-badge my-creations-badge--exported'
                        : 'my-creations-badge my-creations-badge--draft'
                    }
                  >
                    {status === 'exported' ? 'Exported' : 'Draft'}
                  </span>
                </div>

                <div className="my-creations-item-row2">
                  <div className="my-creations-item-meta">Updated {formatUpdated(row.updatedAt)}</div>

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

  const renderActivityContent = () => {
    return (
      <div className="profile-activity-grid">
        <div className="profile-activity-card">
          <div className="profile-activity-card-header">
            <h4 className="profile-activity-card-title">Creations</h4>
            <span className="profile-activity-card-count">0</span>
          </div>
          <p className="profile-section-empty profile-section-empty--compact">
            Exported stickers will appear here.
          </p>
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
  }

  const draftsSection = (
    <div className="profile-section profile-section--drafts">
      <div className="profile-section-header">
        <h3 className="profile-section-title">Drafts</h3>
        {!loading && !error ? <span className="profile-section-count">{items.length}</span> : null}
      </div>

      <div className="profile-section-body">{renderDraftsContent()}</div>
    </div>
  )

  const activitySection = (
    <div className="profile-section profile-section--activity">
      <div className="profile-section-header">
        <h3 className="profile-section-title">Activity</h3>
        <span className="profile-section-count">0</span>
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

  if (showEditProfile) {
    return (
      <EditProfile
        onSave={() => setShowEditProfile(false)}
        onCancel={() => setShowEditProfile(false)}
      />
    )
  }

  return (
    <div className="profile-page" role="region" aria-label="Profile">
      <div className="profile-header">
        <div className="profile-avatar" aria-hidden="true">
          <span className="profile-avatar-initials">SC</span>
        </div>

        <p className="profile-name">Your Name</p>
        <p className="profile-bio">No bio yet.</p>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => setShowEditProfile(true)}
        >
          Edit Profile
        </button>

        <div className="profile-socials">
          <button type="button" className="profile-social-link">
            Instagram
          </button>

          <button type="button" className="profile-social-link">
            Twitter
          </button>
        </div>
      </div>

      {draftsSection}
      {showConnectionsBeforeActivity ? connectionsSection : activitySection}
      {showConnectionsBeforeActivity ? activitySection : connectionsSection}

      <div className="profile-account">
        <p className="profile-account-title">Account</p>

        <div className="profile-account-actions">
          <button type="button" className="profile-account-action">
            <span>Change Email</span>
            <span className="profile-account-action-arrow" aria-hidden="true">
              ›
            </span>
          </button>

          <button type="button" className="profile-account-action">
            <span>Change Password</span>
            <span className="profile-account-action-arrow" aria-hidden="true">
              ›
            </span>
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
    </div>
  )
}

export default MyCreationsPage