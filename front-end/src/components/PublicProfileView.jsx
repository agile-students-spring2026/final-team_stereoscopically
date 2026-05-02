import { useEffect, useState } from 'react'
import { fetchPublicUserProfile, followUser, unfollowUser } from '../services/usersApi.js'

function PublicProfileView({ user: initialUser, onBack, currentUser }) {
  const [profile, setProfile] = useState(initialUser || null)
  const [loading, setLoading] = useState(Boolean(initialUser?.username))
  const [notFound, setNotFound] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [isFollowing, setIsFollowing] = useState(initialUser?.isFollowing ?? false)
  const [isPending, setIsPending] = useState(false)
  const [followError, setFollowError] = useState(null)

  useEffect(() => {
    const username = initialUser?.username
    if (!username) return
    // schedule state updates to avoid synchronous setState inside effect body
    Promise.resolve().then(() => {
      setLoading(true)
      setNotFound(false)
      setFetchError(null)
    })
    fetchPublicUserProfile(username)
      .then((data) => {
        setProfile(data)
        setIsFollowing(data.isFollowing ?? false)
      })
      .catch((err) => {
        if (err?.status === 404) {
          setNotFound(true)
          setProfile(null)
        } else {
          setFetchError('Could not load this profile. Please try again.')
        }
      })
    .finally(() => setLoading(false))
  }, [initialUser?.username])

  const handleFollow = async () => {
    if (!profile) return
    setIsPending(true)
    setFollowError(null)
    try {
      await followUser(profile.id)
      setIsFollowing(true)
    } catch (err) {
      setFollowError(err.message || 'Could not follow. Please try again.')
    } finally {
      setIsPending(false)
    }
  }

  const handleUnfollow = async () => {
    if (!profile) return
    setIsPending(true)
    setFollowError(null)
    try {
      await unfollowUser(profile.id)
      setIsFollowing(false)
    } catch (err) {
      setFollowError(err.message || 'Could not unfollow. Please try again.')
    } finally {
      setIsPending(false)
    }
  }

  const initial = (profile?.displayName || profile?.username || '?').charAt(0).toUpperCase()
  const isOwnProfile = currentUser && profile && currentUser.id === profile.id

  return (
    <section className="public-profile-shell" aria-label="User profile">
      <button type="button" className="public-profile-back" onClick={onBack}>
        ← Back
      </button>

      {loading && (
        <p className="editor-status editor-status--loading">Loading profile…</p>
      )}

      {notFound && !loading && (
        <div className="card home-card public-profile-not-found">
          <p className="editor-status" style={{ fontSize: '1.5rem', margin: '0 0 0.5rem' }}>
            🔍
          </p>
          <p className="profile-name">User not found</p>
          <p className="editor-status" style={{ marginTop: '0.5rem' }}>
            This profile doesn&rsquo;t exist or the username may have changed.
          </p>
          <button type="button" className="btn-secondary" style={{ marginTop: '1rem' }} onClick={onBack}>
            Go back
          </button>
        </div>
      )}

      {fetchError && !loading && (
        <div className="card home-card">
          <p className="editor-status editor-status--error" role="alert">
            {fetchError}
          </p>
          <button type="button" className="btn-secondary" style={{ marginTop: '1rem' }} onClick={onBack}>
            Go back
          </button>
        </div>
      )}

      {profile && !loading && (
        <div className="profile-header">
          <div className="profile-avatar">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt=""
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <span className="profile-avatar-initials">{initial}</span>
            )}
          </div>

          <p className="profile-name">{profile.displayName || profile.username}</p>
          {profile.username && <p className="profile-username">@{profile.username}</p>}
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}

          {(profile.instagram || profile.x) && (
            <div className="profile-socials">
              {profile.instagram && (
                <a
                  href={`https://instagram.com/${profile.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="profile-social-link"
                >
                  Instagram
                </a>
              )}
              {profile.x && (
                <a
                  href={`https://x.com/${profile.x}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="profile-social-link"
                >
                  X
                </a>
              )}
            </div>
          )}

          {!isOwnProfile && (
            <div className="public-profile-follow-row">
              {isFollowing ? (
                <button
                  type="button"
                  className="profile-friend-btn profile-friend-btn--following"
                  onClick={handleUnfollow}
                  disabled={isPending}
                >
                  {isPending ? '…' : 'Following'}
                </button>
              ) : (
                <button
                  type="button"
                  className="profile-friend-btn profile-friend-btn--accept"
                  onClick={handleFollow}
                  disabled={isPending}
                >
                  {isPending ? '…' : 'Follow'}
                </button>
              )}
            </div>
          )}

          {followError && (
            <p className="editor-status editor-status--error" role="alert">
              {followError}
            </p>
          )}
        </div>
      )}

      {profile && !loading && (
        <article className="card home-card" aria-labelledby="pub-profile-creations-heading">
          <h2 id="pub-profile-creations-heading">Shared Creations</h2>
          <p className="editor-status">No shared creations yet.</p>
        </article>
      )}
    </section>
  )
}

export default PublicProfileView
