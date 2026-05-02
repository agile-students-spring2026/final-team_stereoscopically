import { useState } from 'react'

function EditorToolScreen({
  title,
  subtitle = '',
  preview,
  controls,
  onCancel,
  onApply,
  cancelLabel = 'Cancel',
  applyLabel = 'Apply',
  applyingLabel = 'Applying…',
  disabled = false,
  actions = null,
  hideActions = false,
  className = '',
}) {
  const [isApplying, setIsApplying] = useState(false)

  const handleApply = async () => {
    if (isApplying || disabled) return
    setIsApplying(true)
    try {
      await onApply?.()
    } finally {
      setIsApplying(false)
    }
  }

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
              <button type="button" className="btn-secondary" onClick={onCancel} disabled={isApplying}>
                {cancelLabel}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleApply}
                disabled={isApplying || disabled}
              >
                {isApplying ? applyingLabel : applyLabel}
              </button>
            </div>
          ))}
    </div>
  )
}

export default EditorToolScreen
