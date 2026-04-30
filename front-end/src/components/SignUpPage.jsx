import { useState } from 'react'

function SignUpPage({ onSignUp, onBack, onGoSignIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

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
            <div style={{ position: 'relative' }}>
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <div className="auth-field">
            <label htmlFor="signup-confirm" className="auth-label">
              Confirm Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="signup-confirm"
                type={showConfirm ? 'text' : 'password'}
                className="auth-input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((prev) => !prev)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? 'Hide' : 'Show'}
              </button>
            </div>
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