import { useState } from 'react'

function SignUpPage({ onSignUp, onBack, onGoSignIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSignUp()
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <button type="button" className="auth-back-btn" onClick={onBack}>
          ← Back
        </button>
        <h2 className="auth-card-title">Sign Up</h2>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="signup-email" className="auth-label">
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div className="auth-field">
            <label htmlFor="signup-password" className="auth-label">
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
          <div className="auth-field">
            <label htmlFor="signup-confirm" className="auth-label">
              Confirm Password
            </label>
            <input
              id="signup-confirm"
              type="password"
              className="auth-input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="btn-primary auth-action-btn">
            Create Account
          </button>
        </form>
        <p className="auth-switch-text">
          Already have an account?{' '}
          <button type="button" className="auth-switch-link" onClick={onGoSignIn}>
            Sign In
          </button>
        </p>
      </div>
    </div>
  )
}

export default SignUpPage
