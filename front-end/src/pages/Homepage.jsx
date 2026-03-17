function Homepage({ onLogin, onCreateAccount, onGuestMode }) {
  return (
    <div className="app-container">
      <div className="screen-header">
        <div className="app-logo">StickerCreate</div>
        <h1 className="screen-title">Welcome to your Personal Emote Studio.</h1>
      </div>
      <div className="card">
        <button type="button" className="btn-primary" onClick={onCreateAccount}>
          Create Account
        </button>
        <button type="button" className="btn-primary" onClick={onLogin}>
          Log In
        </button>
        <button type="button" className="btn-secondary" onClick={onGuestMode}>
          Guest Mode
        </button>
      </div>
    </div>
  );
}

export default Homepage;
