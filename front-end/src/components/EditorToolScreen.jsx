function EditorToolScreen({
  title,
  subtitle = '',
  preview,
  controls,
  onCancel,
  onApply,
  cancelLabel = 'Cancel',
  applyLabel = 'Apply',
  actions = null,
  hideActions = false,
  className = '',
}) {
  const rootClassName = ['editor-tool-screen', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rootClassName}>
      <div className="screen-header screen-header-column">
        <h2 className="screen-title">{title}</h2>
        {subtitle ? <p className="screen-subtitle">{subtitle}</p> : null}
      </div>

      {preview}

      {controls}

      {hideActions
        ? null
        : (actions ? (
            <div className="editor-actions editor-actions--inline editor-tool-screen-actions">{actions}</div>
          ) : (
            <div className="editor-actions editor-actions--inline editor-tool-screen-actions">
              <button type="button" className="btn-secondary" onClick={onCancel}>
                {cancelLabel}
              </button>
              <button type="button" className="btn-primary" onClick={onApply}>
                {applyLabel}
              </button>
            </div>
          ))}
    </div>
  )
}

export default EditorToolScreen
