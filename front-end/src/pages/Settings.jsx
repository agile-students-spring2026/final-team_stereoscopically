function Settings({ onLogout }) {
  return (
    <div className="app-container">
      <div className="screen-header">
        <div className="app-logo">StickerCreate</div>
        <h2 className="screen-title">Settings</h2>
      </div>
      <div className="card">
        <button type="button" className="btn-primary" onClick={onLogout}>
          Log Out
        </button>
      </div>
    </div>
  );
}

export default Settings;
