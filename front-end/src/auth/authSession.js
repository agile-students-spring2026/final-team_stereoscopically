const STORAGE_KEY = 'stickercreate_auth_token'
const DEV_GUEST_KEY = 'stickercreate_dev_guest'

export const DEV_GUEST_PROFILE = {
  email: 'guest@local.dev',
  displayName: 'Dev Guest',
  bio: 'No server account; drafts use this browser ownerKey.',
}

export const getAuthToken = () => {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v && typeof v === 'string' ? v.trim() : ''
  } catch {
    return ''
  }
}

export const setAuthToken = (token) => {
  try {
    if (token && typeof token === 'string') {
      localStorage.setItem(STORAGE_KEY, token.trim())
      localStorage.removeItem(DEV_GUEST_KEY)
    }
  } catch {}
}

export const clearAuthToken = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

export const setDevGuestSession = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.setItem(DEV_GUEST_KEY, '1')
  } catch {}
}

export const clearDevGuestSession = () => {
  try {
    localStorage.removeItem(DEV_GUEST_KEY)
  } catch {}
}

export const isDevGuestSession = () => {
  try {
    return localStorage.getItem(DEV_GUEST_KEY) === '1' && !getAuthToken()
  } catch {
    return false
  }
}
