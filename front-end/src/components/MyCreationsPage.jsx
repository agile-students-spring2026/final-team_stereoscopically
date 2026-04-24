import { useCallback, useEffect, useState } from 'react'
import { deleteCreation, fetchCreations } from '../services/creationsApi.js'
import { getCreationKindLabel, getCreationPreviewUrl } from '../utils/creationPreviewUrl.js'
import { getOrCreateOwnerKey } from '../utils/ownerKey.js'

function CreationPreviewThumb({ row, title }) {
  const url = getCreationPreviewUrl(row)
  const kind = getCreationKindLabel(row)
  const [failed, setFailed] = useState(false)

  if (url && !failed) {
    return (
      <div className="my-creations-thumb-wrap">
        <img
          src={url}
          alt={title ? `Preview: ${title}` : 'Preview'}
          className="my-creations-thumb"
          onError={() => setFailed(true)}
        />
      </div>
    )
  }

  const placeholderLabel = kind === 'video' ? 'Video' : kind === 'image' ? 'Image' : 'Sticker'
  return (
    <div className="my-creations-thumb-wrap my-creations-thumb-wrap--placeholder" aria-hidden="true">
      <span className="my-creations-thumb-placeholder-label">{placeholderLabel}</span>
    </div>
  )
}

const formatUpdated = (iso) => {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return '—'
  }
}

function MyCreationsPage({ refreshKey = 0, onSelectCreation }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteDialogError, setDeleteDialogError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const ownerKey = getOrCreateOwnerKey()

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchCreations(ownerKey)
        if (!cancelled) {
          setItems(Array.isArray(data) ? data : [])
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load creations.')
          setItems([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const requestDelete = useCallback((e, row) => {
    e?.stopPropagation?.()
    const id = row?._id ?? row?.id
    if (id == null) return
    const rawTitle = typeof row?.title === 'string' && row.title.trim() ? row.title.trim() : 'Untitled'
    setDeleteDialogError(null)
    setPendingDelete({ id: String(id), title: rawTitle })
  }, [])

  const cancelDelete = useCallback(
    (e) => {
      e?.stopPropagation?.()
      if (isDeleting) return
      setPendingDelete(null)
      setDeleteDialogError(null)
    },
    [isDeleting]
  )

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete || isDeleting) return
    setIsDeleting(true)
    setDeleteDialogError(null)
    try {
      await deleteCreation(pendingDelete.id)
      setItems((prev) => prev.filter((row) => String(row._id ?? row.id) !== pendingDelete.id))
      setPendingDelete(null)
    } catch (err) {
      setDeleteDialogError(err?.message || 'Could not delete.')
    } finally {
      setIsDeleting(false)
    }
  }, [isDeleting, pendingDelete])

  useEffect(() => {
    if (!pendingDelete) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape' && !isDeleting) {
        e.preventDefault()
        setPendingDelete(null)
        setDeleteDialogError(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pendingDelete, isDeleting])

  if (loading) {
    return (
      <div className="my-creations" role="region" aria-label="My Creations">
        <p className="editor-status editor-status--loading editor-status--centered">Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="my-creations" role="region" aria-label="My Creations">
        <p className="editor-status editor-status--error editor-status--spaced">{error}</p>
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="my-creations my-creations--empty" role="region" aria-label="My Creations">
        <p className="my-creations-empty-hint">
          No saved stickers yet. Use <strong>Save for later</strong> in the editor to keep a draft here.
        </p>
      </div>
    )
  }

  return (
    <div className="my-creations" role="region" aria-label="My Creations">
      <p className="my-creations-subtitle">Drafts and exported stickers from this browser.</p>
      <ul className="my-creations-list">
        {items.map((row) => {
          const id = row._id ?? row.id
          const title = typeof row.title === 'string' && row.title.trim() ? row.title.trim() : 'Untitled'
          const status = row.status === 'exported' ? 'exported' : 'draft'
          return (
            <li
              key={id}
              className={`my-creations-item${onSelectCreation ? ' my-creations-item--clickable' : ''}`}
              onClick={() => onSelectCreation?.(row)}
              role={onSelectCreation ? 'button' : undefined}
              tabIndex={onSelectCreation ? 0 : undefined}
              onKeyDown={
                onSelectCreation
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') onSelectCreation(row)
                    }
                  : undefined
              }
            >
              <CreationPreviewThumb row={row} title={title} />
              <div className="my-creations-item-body">
                <div className="my-creations-item-main">
                  {onSelectCreation ? (
                    <button
                      type="button"
                      className="my-creations-item-title my-creations-item-title--link"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectCreation(row)
                      }}
                    >
                      {title}
                    </button>
                  ) : (
                    <span className="my-creations-item-title">{title}</span>
                  )}
                  <span
                    className={
                      status === 'exported'
                        ? 'my-creations-badge my-creations-badge--exported'
                        : 'my-creations-badge my-creations-badge--draft'
                    }
                  >
                    {status === 'exported' ? 'Exported' : 'Draft'}
                  </span>
                </div>
                <div className="my-creations-item-row2">
                  <div className="my-creations-item-meta">Updated {formatUpdated(row.updatedAt)}</div>
                  <button
                    type="button"
                    className="my-creations-delete"
                    onClick={(e) => requestDelete(e, row)}
                    aria-label={`Delete ${title}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      {pendingDelete ? (
        <div
          className="my-creations-modal-backdrop"
          role="presentation"
          onClick={cancelDelete}
        >
          <div
            className="my-creations-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="my-creations-delete-heading"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="my-creations-delete-heading" className="my-creations-modal-title">
              Delete this creation?
            </h2>
            <p className="my-creations-modal-text">
              <span className="my-creations-modal-quot">&ldquo;{pendingDelete.title}&rdquo;</span> will be removed. This
              cannot be undone.
            </p>
            {deleteDialogError ? (
              <p className="my-creations-modal-error" role="alert">
                {deleteDialogError}
              </p>
            ) : null}
            <div className="my-creations-modal-actions">
              <button type="button" className="my-creations-modal-btn" onClick={cancelDelete} disabled={isDeleting}>
                Cancel
              </button>
              <button
                type="button"
                className="my-creations-modal-btn my-creations-modal-btn--danger"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default MyCreationsPage
