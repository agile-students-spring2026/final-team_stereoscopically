const DEFAULT_BACKEND_BASE_URL = 'http://localhost:4000'

export const getBackendBaseUrl = () =>
  (import.meta.env?.VITE_BACKEND_BASE_URL || DEFAULT_BACKEND_BASE_URL).trim()

const parseErrorMessage = async (response, fallbackMessage = 'Request failed') => {
  try {
    const payload = await response.json()
    if (payload?.error) return payload.error
  } catch {
    // ignore JSON parse errors
  }

  return `${fallbackMessage} (${response.status})`
}

export const postMultipart = async ({
  path,
  fileField,
  file,
  fields,
  fallbackErrorMessage = 'Request failed',
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

  let response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    })
  } catch {
    throw new Error('Unable to reach backend. Please make sure the backend server is running.')
  }

  if (!response.ok) {
    const message = await parseErrorMessage(response, fallbackErrorMessage)
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  return response.json()
}

export const postJson = async ({ path, payload, fallbackErrorMessage = 'Request failed' }) => {
  const endpoint = `${getBackendBaseUrl()}${path}`

  let response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload ?? {}),
    })
  } catch {
    throw new Error('Unable to reach backend. Please make sure the backend server is running.')
  }

  if (!response.ok) {
    const message = await parseErrorMessage(response, fallbackErrorMessage)
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  return response.json()
}

export const getJson = async ({ path, fallbackErrorMessage = 'Request failed' }) => {
  const endpoint = `${getBackendBaseUrl()}${path}`

  let response
  try {
    response = await fetch(endpoint, { method: 'GET' })
  } catch {
    throw new Error('Unable to reach backend. Please make sure the backend server is running.')
  }

  if (!response.ok) {
    const message = await parseErrorMessage(response, fallbackErrorMessage)
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  return response.json()
}

export const deleteJson = async ({ path, fallbackErrorMessage = 'Request failed' }) => {
  const endpoint = `${getBackendBaseUrl()}${path}`

  let response
  try {
    response = await fetch(endpoint, { method: 'DELETE' })
  } catch {
    throw new Error('Unable to reach backend. Please make sure the backend server is running.')
  }

  if (!response.ok) {
    const message = await parseErrorMessage(response, fallbackErrorMessage)
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  return response.json()
}

export const patchJson = async ({ path, payload, fallbackErrorMessage = 'Request failed' }) => {
  const endpoint = `${getBackendBaseUrl()}${path}`

  let response
  try {
    response = await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload ?? {}),
    })
  } catch {
    throw new Error('Unable to reach backend. Please make sure the backend server is running.')
  }

  if (!response.ok) {
    const message = await parseErrorMessage(response, fallbackErrorMessage)
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  return response.json()
}
