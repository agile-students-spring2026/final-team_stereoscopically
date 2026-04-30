const STORAGE_KEY = 'stickercreate_auth_token'

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
    }
  } catch {
    void 0
  }
}

export const clearAuthToken = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    void 0
  }
}
