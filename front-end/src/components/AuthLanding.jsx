function AuthLanding({ onSignIn, onSignUp, onGuest, onDevGuest }) {
  return (
    <div className="auth-screen">
      <div className="auth-landing-brand">
        <h1 className="auth-landing-title">StickerCreate</h1>
        <p className="auth-landing-tagline">Make your stickers, your way.</p>
      </div>
      <div className="auth-landing-actions">
        <button type="button" className="btn-primary auth-action-btn" onClick={onSignIn}>
          Sign In
        </button>
        <button type="button" className="btn-secondary auth-action-btn" onClick={onSignUp}>
          Sign Up
        </button>
        <button type="button" className="auth-guest-btn" onClick={onGuest}>
          Continue as Guest
        </button>
        {onDevGuest ? (
          <button type="button" className="auth-dev-guest-btn" onClick={onDevGuest}>
            Dev session (no backend login)
          </button>
        ) : null}
      </div>
    </div>
  )
}

export default AuthLanding
