import { useCallback, useEffect, useState } from 'react'
import * as usersApi from '../services/usersApi.js'
import * as creationsApi from '../services/creationsApi.js'
import { getCreationPreviewUrl } from '../utils/creationPreviewUrl.js'

function UserAvatar({ user }) {
  const initial = (user.displayName || user.username || '?').charAt(0).toUpperCase()
  if (user.avatarUrl) {
    return (
      <img src={user.avatarUrl} alt="" className="home-user-avatar-img" aria-hidden="true" />
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

function CreationFeedItem({ creation }) {
  const creationId = creation._id ?? creation.id
  const creator = creation.userId ? (typeof creation.userId === 'object' ? creation.userId : {}) : {}
  const creatorName = creator.displayName || creator.username || 'Unknown'
  const previewUrl = getCreationPreviewUrl(creation)
  const [imageLoadFailed, setImageLoadFailed] = useState(false)

  return (
    <li className="home-feed-item">
      <div className="home-feed-item-preview">
        {previewUrl && !imageLoadFailed ? (
          <img
            src={previewUrl}
            alt={`${creation.title || 'Untitled'} by ${creatorName}`}
            className="home-feed-item-image"
            onError={() => setImageLoadFailed(true)}
          />
        ) : (
          <div className="home-feed-item-placeholder" aria-hidden="true">
            <span className="home-feed-item-placeholder-text">No preview</span>
          </div>
        )}
      </div>
      <div className="home-feed-item-content">
        <span className="home-feed-item-title">{creation.title || 'Untitled'}</span>
        <span className="home-feed-item-creator">by {creatorName}</span>
      </div>
    </li>
  )
}

function HomeView({ isAuthenticated, onNavigateToProfile, onGoToProfile, followingRefreshKey = 0 }) {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)

  // following is kept to track isFollowing on search results; not rendered as a list here
  const [following, setFollowing] = useState([])

  const [feed, setFeed] = useState([])
  const [feedLoading, setFeedLoading] = useState(false)

  const [pendingIds, setPendingIds] = useState(new Set())
  const [pendingLikeIds, setPendingLikeIds] = useState(new Set())
  const [likedCreationIds, setLikedCreationIds] = useState(new Set())
  const [followError, setFollowError] = useState(null)

  const followingIds = new Set(following.map((u) => u.id))

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

  const handleLike = useCallback(async (creationId) => {
    setPendingLikeIds((prev) => new Set([...prev, creationId]))
    try {
      await creationsApi.likeCreation(creationId)
      setLikedCreationIds((prev) => new Set([...prev, creationId]))
    } catch (err) {
      console.error('Could not like creation:', err)
    } finally {
      setPendingLikeIds((prev) => {
        const next = new Set(prev)
        next.delete(creationId)
        return next
      })
    }
  }, [])

  const handleUnlike = useCallback(async (creationId) => {
    setPendingLikeIds((prev) => new Set([...prev, creationId]))
    try {
      await creationsApi.unlikeCreation(creationId)
      setLikedCreationIds((prev) => {
        const next = new Set(prev)
        next.delete(creationId)
        return next
      })
    } catch (err) {
      console.error('Could not unlike creation:', err)
    } finally {
      setPendingLikeIds((prev) => {
        const next = new Set(prev)
        next.delete(creationId)
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

  return (
    <section className="home-shell" aria-label="Home">
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

        {feedLoading ? (
          <p className="editor-status editor-status--loading">Loading…</p>
        ) : feed.length === 0 ? (
          <p className="editor-status">
            No shared creations yet. When people you follow share stickers,
            they&rsquo;ll appear here.
          </p>
        ) : (
          <ul className="home-feed-list" role="list">
            {feed.map((creation) => {
              const creationId = creation._id ?? creation.id
              const isLiked = likedCreationIds.has(String(creationId))
              const isPending = pendingLikeIds.has(String(creationId))

              return (
                <CreationFeedItem
                  key={creationId}
                  creation={creation}
                />
              )
            })}
          </ul>
        )}
      </article>
    </section>
  )
}

export default HomeView

