import { useCallback, useEffect, useMemo, useState } from 'react'
import * as usersApi from '../services/usersApi.js'
import { getCreationThumbDescriptor } from '../utils/creationPreviewUrl.js'
import { normalizeUserMediaSrc } from '../utils/mediaPublicUrl.js'

function creationHasRestorablePayload(creation) {
  const payload = creation?.editorPayload
  return Boolean(
    payload && typeof payload === 'object' && (payload.kind === 'image' || payload.kind === 'video'),
  )
}

function UserAvatar({ user }) {
  const initial = (user.displayName || user.username || '?').charAt(0).toUpperCase()
  if (user.avatarUrl) {
    return (
      <img src={normalizeUserMediaSrc(user.avatarUrl)} alt="" className="home-user-avatar-img" aria-hidden="true" />
    )
  }
  return (
    <div className="profile-friend-avatar" aria-hidden="true">
      {initial}
    </div>
  )
}

function UserRow({ user, isFollowing, isPending, onFollow, onUnfollow, onClick }) {
  return (
    <li className="profile-friend-item">
      <button
        type="button"
        className="home-user-avatar-btn"
        onClick={onClick}
        aria-label={`View ${user.displayName || user.username}'s profile`}
        tabIndex={-1}
      >
        <UserAvatar user={user} />
      </button>
      <button type="button" className="profile-friend-info home-user-info-btn" onClick={onClick}>
        <span className="profile-friend-name">{user.displayName || user.username}</span>
        {user.username && <span className="profile-friend-handle">@{user.username}</span>}
        {user.bio && <span className="home-user-bio">{user.bio}</span>}
      </button>
      <div className="profile-friend-actions">
        {isFollowing ? (
          <button
            type="button"
            className="profile-friend-btn profile-friend-btn--following"
            onClick={() => onUnfollow(user.id)}
            disabled={isPending}
            aria-label={`Unfollow ${user.displayName || user.username}`}
          >
            {isPending ? '…' : 'Following'}
          </button>
        ) : (
          <button
            type="button"
            className="profile-friend-btn profile-friend-btn--accept"
            onClick={() => onFollow(user.id)}
            disabled={isPending}
            aria-label={`Follow ${user.displayName || user.username}`}
          >
            {isPending ? '…' : 'Follow'}
          </button>
        )}
      </div>
    </li>
  )
}

function CreationFeedItem({
  creation,
  onPreview,
  onEditFrom,
  canEditFrom,
  isSaved,
  onToggleSave,
  savePending,
}) {
  const creator = creation.userId ? (typeof creation.userId === 'object' ? creation.userId : {}) : {}
  const creatorName = creator.displayName || creator.username || 'Unknown'
  const preview = getCreationThumbDescriptor(creation)
  const [previewFailed, setPreviewFailed] = useState(false)
  const id = String(creation._id ?? creation.id ?? '')

  return (
    <li className="home-feed-item home-feed-item--with-actions">
      <div className="home-feed-item-body">
        <div className="home-feed-item-preview" aria-hidden="true">
          {preview.url && !previewFailed ? (
            preview.mode === 'video' ? (
              <video
                key={preview.url}
                className="home-feed-item-image"
                src={preview.url}
                poster={preview.posterUrl || undefined}
                muted
                autoPlay
                loop
                playsInline
                preload="metadata"
                onError={() => setPreviewFailed(true)}
              >
                <source src={preview.url} type="video/mp4" />
              </video>
            ) : (
              <img
                src={preview.url}
                alt=""
                className="home-feed-item-image"
                onError={() => setPreviewFailed(true)}
              />
            )
          ) : (
            <div className="home-feed-item-placeholder" aria-hidden="true">
              <span className="home-feed-item-placeholder-text">No preview</span>
            </div>
          )}
        </div>
        <div className="home-feed-item-col">
          <div className="home-feed-item-content">
            <span className="home-feed-item-title">{creation.title || 'Untitled'}</span>
            <span className="home-feed-item-creator">by {creatorName}</span>
          </div>
          <div className="home-feed-item-actions">
            <button
              type="button"
              className="btn-secondary home-feed-item-btn"
              onClick={() => onPreview?.(creation)}
            >
              Preview
            </button>
            <button
              type="button"
              className={`btn-secondary home-feed-item-btn${isSaved ? ' home-feed-item-btn--saved' : ''}`}
              disabled={!id || savePending}
              onClick={() => onToggleSave?.(id, Boolean(isSaved))}
              aria-label={isSaved ? 'Remove from saved stickers' : 'Save sticker from feed'}
            >
              {savePending ? '…' : isSaved ? 'Saved' : 'Save sticker'}
            </button>
            <button
              type="button"
              className="btn-primary home-feed-item-btn"
              disabled={!canEditFrom}
              title={canEditFrom ? undefined : 'No editable project attached to this share.'}
              onClick={() => onEditFrom?.(creation)}
            >
              Edit from this
            </button>
          </div>
        </div>
      </div>
    </li>
  )
}

function HomeView({
  isAuthenticated,
  onNavigateToProfile,
  onGoToProfile,
  followingRefreshKey = 0,
  onOpenFeedSticker,
}) {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)

  // following is kept to track isFollowing on search results; not rendered as a list here
  const [following, setFollowing] = useState([])

  const [feed, setFeed] = useState([])
  const [feedLoading, setFeedLoading] = useState(false)
  const [feedPreviewCreation, setFeedPreviewCreation] = useState(null)
  const [saveFeedPendingIds, setSaveFeedPendingIds] = useState(() => new Set())
  const [saveFeedError, setSaveFeedError] = useState(null)

  const [pendingIds, setPendingIds] = useState(new Set())
  const [followError, setFollowError] = useState(null)

  const followingIds = new Set(following.map((u) => u.id))

  const savedCountOnFeed = useMemo(
    () => feed.filter((c) => Boolean(c.isSaved)).length,
    [feed],
  )

  /** Saved rows first; stable sort keeps original order within each group. */
  const sortedFeed = useMemo(() => {
    const list = [...feed]
    list.sort((a, b) => {
      const aSaved = Boolean(a.isSaved)
      const bSaved = Boolean(b.isSaved)
      if (aSaved === bSaved) return 0
      return aSaved ? -1 : 1
    })
    return list
  }, [feed])

  useEffect(() => {
    if (!isAuthenticated) return
    usersApi
      .fetchFollowing()
      .then(({ users }) => setFollowing(users || []))
      .catch(() => {})
  }, [isAuthenticated, followingRefreshKey])

  useEffect(() => {
    if (!isAuthenticated) return
    // schedule loading state update in a microtask to avoid synchronous setState in effect
    Promise.resolve().then(() => setFeedLoading(true))
    usersApi
      .fetchHomeFeed()
      .then(({ creations }) => setFeed(creations || []))
      .catch(() => {})
      .finally(() => setFeedLoading(false))
  }, [isAuthenticated, followingRefreshKey])

  const handleSearch = useCallback(async () => {
    const q = query.trim()
    if (!q) return
    setSearchLoading(true)
    setSearchError(null)
    setHasSearched(true)
    try {
      const { users } = await usersApi.searchUsers(q)
      setSearchResults(users || [])
    } catch (err) {
      setSearchError(err.message || 'Search failed. Please try again.')
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }, [query])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleFeedPreview = useCallback((creation) => {
    setFeedPreviewCreation(creation)
  }, [])

  const handleToggleSaveFeedCreation = useCallback(async (creationId, currentlySaved) => {
    setSaveFeedError(null)
    setSaveFeedPendingIds((prev) => new Set([...prev, creationId]))
    try {
      if (currentlySaved) {
        await usersApi.unsaveFeedCreation(creationId)
        setFeed((prev) =>
          prev.map((c) =>
            String(c._id ?? c.id) === creationId ? { ...c, isSaved: false } : c,
          ),
        )
      } else {
        await usersApi.saveFeedCreation(creationId)
        setFeed((prev) =>
          prev.map((c) =>
            String(c._id ?? c.id) === creationId ? { ...c, isSaved: true } : c,
          ),
        )
      }
    } catch (err) {
      setSaveFeedError(err?.message || 'Could not update saved sticker.')
    } finally {
      setSaveFeedPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(creationId)
        return next
      })
    }
  }, [])

  const handleFeedEditFrom = useCallback(
    (creation) => {
      if (!creationHasRestorablePayload(creation) || typeof onOpenFeedSticker !== 'function') return
      onOpenFeedSticker(creation)
    },
    [onOpenFeedSticker],
  )

  const handleFollow = useCallback(
    async (userId) => {
      setPendingIds((prev) => new Set([...prev, userId]))
      setFollowError(null)
      try {
        await usersApi.followUser(userId)
        const userObj = searchResults.find((u) => u.id === userId)
        if (userObj) {
          setFollowing((prev) =>
            prev.find((u) => u.id === userId) ? prev : [...prev, userObj]
          )
        }
      } catch (err) {
        setFollowError(err.message || 'Could not follow. Please try again.')
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev)
          next.delete(userId)
          return next
        })
      }
    },
    [searchResults]
  )

  const handleUnfollow = useCallback(async (userId) => {
    setPendingIds((prev) => new Set([...prev, userId]))
    setFollowError(null)
    try {
      await usersApi.unfollowUser(userId)
      setFollowing((prev) => prev.filter((u) => u.id !== userId))
    } catch (err) {
      setFollowError(err.message || 'Could not unfollow. Please try again.')
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }, [])

  if (!isAuthenticated) {
    return (
      <section className="home-shell" aria-labelledby="home-title">
        <article className="card home-card">
          <h2 id="home-title">Home</h2>
          <p className="editor-status editor-status--info">
            Sign in to discover creators and see what people are sharing.
          </p>
        </article>
      </section>
    )
  }

  const feedPreviewDesc = feedPreviewCreation ? getCreationThumbDescriptor(feedPreviewCreation) : null
  const canEditFeedPreview =
    Boolean(feedPreviewCreation) &&
    creationHasRestorablePayload(feedPreviewCreation) &&
    typeof onOpenFeedSticker === 'function'

  const feedPreviewCreator = feedPreviewCreation?.userId && typeof feedPreviewCreation.userId === 'object'
    ? feedPreviewCreation.userId
    : {}
  const feedPreviewCreatorName =
    feedPreviewCreator.displayName || feedPreviewCreator.username || 'Unknown'

  return (
    <section className="home-shell" aria-label="Home">
      {feedPreviewCreation ? (
        <div
          className="feed-sticker-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feed-sticker-modal-title"
        >
          <button
            type="button"
            className="feed-sticker-modal-backdrop"
            aria-label="Close preview"
            onClick={() => setFeedPreviewCreation(null)}
          />
          <div className="feed-sticker-modal-card">
            <h3 id="feed-sticker-modal-title" className="feed-sticker-modal-title">
              {feedPreviewCreation.title || 'Untitled'}
            </h3>
            <p className="feed-sticker-modal-sub">by {feedPreviewCreatorName}</p>
            {feedPreviewDesc?.url ? (
              <div className="feed-sticker-modal-image-wrap">
                {feedPreviewDesc.mode === 'video' ? (
                  <video
                    key={feedPreviewDesc.url}
                    className="feed-sticker-modal-image"
                    src={feedPreviewDesc.url}
                    poster={feedPreviewDesc.posterUrl || undefined}
                    muted
                    autoPlay
                    loop
                    playsInline
                    controls
                    preload="metadata"
                  >
                    <source src={feedPreviewDesc.url} type="video/mp4" />
                  </video>
                ) : (
                  <img
                    key={feedPreviewDesc.url}
                    src={feedPreviewDesc.url}
                    alt=""
                    className="feed-sticker-modal-image feed-sticker-modal-image--bitmap"
                    decoding="async"
                  />
                )}
              </div>
            ) : (
              <p className="editor-status">No preview available for this sticker.</p>
            )}
            <div className="feed-sticker-modal-footer">
              <button type="button" className="btn-secondary feed-sticker-modal-close" onClick={() => setFeedPreviewCreation(null)}>
                Close
              </button>
              {canEditFeedPreview ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    const c = feedPreviewCreation
                    setFeedPreviewCreation(null)
                    onOpenFeedSticker(c)
                  }}
                >
                  Edit from this
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      {/* ── Discover Creators ── */}
      <article className="card home-card" aria-labelledby="home-search-heading">
        <h2 id="home-search-heading">Discover Creators</h2>

        <div className="home-search-row">
          <input
            type="search"
            className="auth-input home-search-input"
            placeholder="Search by username…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Search users by username"
          />
          <button
            type="button"
            className="btn-primary home-search-btn"
            onClick={handleSearch}
            disabled={searchLoading || !query.trim()}
          >
            {searchLoading ? '…' : 'Search'}
          </button>
        </div>

        {searchError && (
          <p className="editor-status editor-status--error" role="alert">
            {searchError}
          </p>
        )}
        {followError && (
          <p className="editor-status editor-status--error" role="alert">
            {followError}
          </p>
        )}
        {!searchLoading && hasSearched && searchResults.length === 0 && !searchError && (
          <p className="editor-status">No users found for &ldquo;{query}&rdquo;.</p>
        )}

        {searchResults.length > 0 && (
          <ul className="profile-friend-list home-user-list" role="list">
            {searchResults.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                isFollowing={followingIds.has(user.id)}
                isPending={pendingIds.has(user.id)}
                onFollow={handleFollow}
                onUnfollow={handleUnfollow}
                onClick={() => onNavigateToProfile?.(user)}
              />
            ))}
          </ul>
        )}

        {!hasSearched && (
          <p className="editor-status home-search-hint">
            Search to find creators to follow.{' '}
            {onGoToProfile && (
              <button type="button" className="home-connections-link" onClick={onGoToProfile}>
                Manage connections in Profile →
              </button>
            )}
          </p>
        )}
      </article>

      {/* ── Feed ── */}
      <article className="card home-card" aria-labelledby="home-feed-heading">
        <h2 id="home-feed-heading">From People You Follow</h2>
        <p className="editor-status home-feed-hint">
          <strong>Save sticker</strong> keeps a post on your list for you only—the person who posted it will not know.
          {savedCountOnFeed > 0 ? ` You have saved ${savedCountOnFeed} here.` : ''}
        </p>

        {saveFeedError ? (
          <p className="editor-status editor-status--error" role="alert">
            {saveFeedError}
          </p>
        ) : null}

        {feedLoading ? (
          <p className="editor-status editor-status--loading">Loading…</p>
        ) : feed.length === 0 ? (
          <p className="editor-status">
            No shared creations yet. When people you follow share stickers,
            they&rsquo;ll appear here.
          </p>
        ) : (
          <ul className="home-feed-list" role="list">
            {sortedFeed.map((creation) => (
              <CreationFeedItem
                key={creation._id ?? creation.id}
                creation={creation}
                onPreview={handleFeedPreview}
                onEditFrom={handleFeedEditFrom}
                canEditFrom={creationHasRestorablePayload(creation) && typeof onOpenFeedSticker === 'function'}
                isSaved={Boolean(creation.isSaved)}
                onToggleSave={handleToggleSaveFeedCreation}
                savePending={saveFeedPendingIds.has(String(creation._id ?? creation.id))}
              />
            ))}
          </ul>
        )}
      </article>
    </section>
  )
}

export default HomeView

