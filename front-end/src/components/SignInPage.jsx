import { useState } from 'react'

function SignInPage({ onSignIn, onBack, onGoSignUp }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    onSignIn()
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <button type="button" className="auth-back-btn" onClick={onBack}>
          ← Back
        </button>
        <h2 className="auth-card-title">Sign In</h2>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="signin-email" className="auth-label">
              Email
            </label>
            <input
              id="signin-email"
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div className="auth-field">
            <label htmlFor="signin-password" className="auth-label">
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="signin-password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
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
          <button type="submit" className="btn-primary auth-action-btn">
            Sign In
          </button>
        </form>
        <p className="auth-switch-text">
          Don&apos;t have an account?{' '}
          <button type="button" className="auth-switch-link" onClick={onGoSignUp}>
            Sign Up
          </button>
        </p>
      </div>
    </div>
  )
}

export default SignInPage