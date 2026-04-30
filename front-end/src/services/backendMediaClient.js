import { clearAuthToken, getAuthToken } from '../auth/authSession.js'

const DEFAULT_BACKEND_BASE_URL = 'http://localhost:4000'

export const getBackendBaseUrl = () =>
  (import.meta.env?.VITE_BACKEND_BASE_URL || DEFAULT_BACKEND_BASE_URL).trim()

const notifyUnauthorized = (skipAuth, hadBearer, status) => {
  if (status !== 401 || skipAuth || !hadBearer) return
  clearAuthToken()
  window.dispatchEvent(new CustomEvent('auth:session-expired'))
}

const parseErrorMessage = async (response, fallbackMessage = 'Request failed') => {
  try {
    const payload = await response.json()
    if (typeof payload?.error === 'string') return payload.error
    if (Array.isArray(payload?.errors) && payload.errors.length) {
      const parts = payload.errors
        .map((e) => (typeof e === 'string' ? e : e.msg || e.message))
        .filter(Boolean)
      if (parts.length) return parts.join(' ')
    }
    if (typeof payload?.message === 'string') return payload.message
  } catch {}

  return `${fallbackMessage} (${response.status})`
}

export const postMultipart = async ({
  path,
  fileField,
  file,
  fields,
  fallbackErrorMessage = 'Request failed',
  skipAuth = false,
}) => {
  if (!file) {
    throw new Error('No file provided')
  }

  const formData = new FormData()
  formData.append(fileField, file)

  if (fields && typeof fields === 'object') {
    Object.entries(fields).forEach(([key, value]) => {
      if (value === undefined || value === null) return
      formData.append(key, String(value))
    })
  }

  const endpoint = `${getBackendBaseUrl()}${path}`
  const tokenAtStart = skipAuth ? '' : getAuthToken()
  const headers = {}
  if (tokenAtStart) headers.Authorization = `Bearer ${tokenAtStart}`

  let response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: formData,
    })
  } catch {
    throw new Error('Unable to reach backend. Please make sure the backend server is running.')
  }

  if (!response.ok) {
    notifyUnauthorized(skipAuth, Boolean(tokenAtStart), response.status)
    const message = await parseErrorMessage(response, fallbackErrorMessage)
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  return response.json()
}

export const postJson = async ({
  path,
  payload,
  fallbackErrorMessage = 'Request failed',
  skipAuth = false,
}) => {
  const endpoint = `${getBackendBaseUrl()}${path}`
  const tokenAtStart = skipAuth ? '' : getAuthToken()
  const headers = { 'Content-Type': 'application/json' }
  if (tokenAtStart) headers.Authorization = `Bearer ${tokenAtStart}`

  let response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload ?? {}),
    })
  } catch {
    throw new Error('Unable to reach backend. Please make sure the backend server is running.')
  }

  if (!response.ok) {
    notifyUnauthorized(skipAuth, Boolean(tokenAtStart), response.status)
    const message = await parseErrorMessage(response, fallbackErrorMessage)
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  return response.json()
}

export const getJson = async ({ path, fallbackErrorMessage = 'Request failed', skipAuth = false }) => {
  const endpoint = `${getBackendBaseUrl()}${path}`
  const tokenAtStart = skipAuth ? '' : getAuthToken()
  const headers = {}
  if (tokenAtStart) headers.Authorization = `Bearer ${tokenAtStart}`

  let response
  try {
    response = await fetch(endpoint, { method: 'GET', headers })
  } catch {
    throw new Error('Unable to reach backend. Please make sure the backend server is running.')
  }

  if (!response.ok) {
    notifyUnauthorized(skipAuth, Boolean(tokenAtStart), response.status)
    const message = await parseErrorMessage(response, fallbackErrorMessage)
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  return response.json()
}

export const deleteJson = async ({ path, fallbackErrorMessage = 'Request failed', skipAuth = false }) => {
  const endpoint = `${getBackendBaseUrl()}${path}`
  const tokenAtStart = skipAuth ? '' : getAuthToken()
  const headers = {}
  if (tokenAtStart) headers.Authorization = `Bearer ${tokenAtStart}`

  let response
  try {
    response = await fetch(endpoint, { method: 'DELETE', headers })
  } catch {
    throw new Error('Unable to reach backend. Please make sure the backend server is running.')
  }

  if (!response.ok) {
    notifyUnauthorized(skipAuth, Boolean(tokenAtStart), response.status)
    const message = await parseErrorMessage(response, fallbackErrorMessage)
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  return response.json()
}

export const patchJson = async ({
  path,
  payload,
  fallbackErrorMessage = 'Request failed',
  skipAuth = false,
}) => {
  const endpoint = `${getBackendBaseUrl()}${path}`
  const tokenAtStart = skipAuth ? '' : getAuthToken()
  const headers = { 'Content-Type': 'application/json' }
  if (tokenAtStart) headers.Authorization = `Bearer ${tokenAtStart}`

  let response
  try {
    response = await fetch(endpoint, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload ?? {}),
    })
  } catch {
    throw new Error('Unable to reach backend. Please make sure the backend server is running.')
  }

  if (!response.ok) {
    notifyUnauthorized(skipAuth, Boolean(tokenAtStart), response.status)
    const message = await parseErrorMessage(response, fallbackErrorMessage)
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  return response.json()
}
