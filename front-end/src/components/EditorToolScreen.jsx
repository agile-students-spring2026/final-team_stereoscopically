function EditorToolScreen({
  title,
  preview,
  controls,
  onCancel,
  onApply,
  cancelLabel = 'Cancel',
  applyLabel = 'Apply',
  actions = null,
  className = '',
}) {
  const rootClassName = ['editor-tool-screen', 'preset-sizes-screen', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rootClassName}>
      <div className="screen-header screen-header-column">
        <h2 className="screen-title">{title}</h2>
      </div>

      {preview}

      {controls}

      {actions ? (
        <div className="card-actions editor-actions editor-actions--inline preset-sizes-screen-actions">{actions}</div>
      ) : (
        <div className="card-actions editor-actions editor-actions--inline preset-sizes-screen-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="btn-primary" onClick={onApply}>
            {applyLabel}
          </button>
        </div>
      )}
    </div>
  )
}

export default EditorToolScreen
