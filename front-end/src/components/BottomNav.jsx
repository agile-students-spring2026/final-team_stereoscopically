function BottomNav({ currentScreen, onNavigate }) {
  return (
    <nav className="bottom-nav">
      <button
        type="button"
        className={currentScreen === 'my-creations' ? 'active' : ''}
        onClick={() => onNavigate('my-creations')}
      >
        My Creations
      </button>
      <button
        type="button"
        className={currentScreen === 'create-new' ? 'active' : ''}
        onClick={() => onNavigate('create-new')}
      >
        Create New
      </button>
      <button
        type="button"
        className={currentScreen === 'settings' ? 'active' : ''}
        onClick={() => onNavigate('settings')}
      >
        Settings
      </button>
    </nav>
  );
}

export default BottomNav;
