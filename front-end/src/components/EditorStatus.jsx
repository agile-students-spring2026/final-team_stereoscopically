function EditorStatus({
  children,
  tone = 'muted',
  role,
  centered = false,
  spaced = false,
  className = '',
}) {
  if (!children) return null

  const computedRole = role || (tone === 'error' ? 'alert' : 'status')
  const classNames = [
    'editor-status',
    tone ? `editor-status--${tone}` : null,
    centered ? 'editor-status--centered' : null,
    spaced ? 'editor-status--spaced' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <p role={computedRole} className={classNames}>
      {children}
    </p>
  )
}

export default EditorStatus
