const STORAGE_KEY = 'sticker_create_owner_key'

const generateKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `owner_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`
}

/**
 * Per-browser stable id used as `ownerKey` for creation APIs (no account system yet).
 */
export const getOrCreateOwnerKey = () => {
  try {
    const existing = localStorage.getItem(STORAGE_KEY)
    if (existing && typeof existing === 'string' && existing.trim()) {
      return existing.trim()
    }
    const next = generateKey()
    localStorage.setItem(STORAGE_KEY, next)
    return next
  } catch {
    return generateKey()
  }
}
