import { useState, useEffect } from 'react'
import { getAuthToken } from '../auth/authSession'

function OtherUserProfile({ userId, onBack }) {
  const [profile, setProfile] = useState(null)
  const [friendshipState, setFriendshipState] = useState('none') 
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/users/${userId}`, {
          headers: { Authorization: `Bearer ${getAuthToken()}` }
        })
        if (!res.ok) throw new Error('Failed to fetch profile')
        const data = await res.json()
        setProfile(data)
      } catch {
        setError('Could not load profile. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }
    if (userId) fetchProfile()
  }, [userId])

  const handleAddFriend = () => {
    setFriendshipState('pending')
  }

  const handleAccept = () => {
    setFriendshipState('friends')
  }

  const handleDecline = () => {
    setFriendshipState('none')
  }

  const renderFriendshipAction = () => {
    switch (friendshipState) {
      case 'none':
        return (
          <button type="button" className="btn-primary" onClick={handleAddFriend}>
            Add Friend
          </button>
        )
      case 'pending':
        return (
          <button type="button" className="btn-secondary" disabled>
            Request Sent
          </button>
        )
      case 'incoming':
        return (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn-primary" onClick={handleAccept}>
              Accept
            </button>
            <button type="button" className="btn-secondary" onClick={handleDecline}>
              Decline
            </button>
          </div>
        )
      case 'friends':
        return (
          <button type="button" className="btn-secondary" disabled>
            Friends
          </button>
        )
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="app-container">
        <div className="screen-header">
          <div className="app-logo">StickerCreate</div>
          <h2 className="screen-title">Profile</h2>
        </div>
        <div className="card">
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-container">
        <div className="screen-header">
          <div className="app-logo">StickerCreate</div>
          <h2 className="screen-title">Profile</h2>
        </div>
        <div className="card">
          <p className="error-text">{error}</p>
          <button type="button" className="btn-secondary" onClick={onBack}>
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-page" role="region" aria-label="Other User Profile">
      <div className="profile-header">
        <div className="profile-avatar" aria-hidden="true">
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.displayName}
              style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <span className="profile-avatar-initials">
              {profile?.displayName?.charAt(0)?.toUpperCase() ?? '?'}
            </span>
          )}
        </div>

        <p className="profile-name">{profile?.displayName || 'Unknown User'}</p>
        <p className="profile-bio">{profile?.bio || 'No bio yet.'}</p>

        <div className="profile-socials">
          {profile?.instagram && (
            <a href={profile.instagram} target="_blank" rel="noreferrer" className="profile-social-link">
              Instagram
            </a>
          )}
          {profile?.x && (
            <a href={profile.x} target="_blank" rel="noreferrer" className="profile-social-link">
              Twitter
            </a>
          )}
        </div>

        <div style={{ marginTop: '1rem' }}>
          {renderFriendshipAction()}
        </div>
      </div>

      <div className="profile-section">
        <div className="profile-section-header">
          <h3 className="profile-section-title">Creations</h3>
        </div>
        <div className="profile-section-body">
          <p className="profile-section-empty">No exported stickers yet.</p>
        </div>
      </div>

      <div className="profile-section">
        <div className="profile-section-header">
          <h3 className="profile-section-title">Liked Stickers</h3>
        </div>
        <div className="profile-section-body">
          <p className="profile-section-empty">No liked stickers yet.</p>
        </div>
      </div>

      <div style={{ padding: '1rem' }}>
        <button type="button" className="btn-secondary" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  )
}

export default OtherUserProfile
