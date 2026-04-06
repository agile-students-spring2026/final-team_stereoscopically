const DEFAULT_BACKEND_BASE_URL = 'http://localhost:4000'

const getBackendBaseUrl = () =>
  (import.meta.env?.VITE_BACKEND_BASE_URL || DEFAULT_BACKEND_BASE_URL).trim()

const parseErrorMessage = async (response) => {
  try {
    const payload = await response.json()
    if (payload?.error) return payload.error
  } catch {
    // ignore JSON parse errors
  }

  return `GIF conversion failed (${response.status})`
}

export const convertVideoToGif = async (videoFile) => {
  if (!videoFile) {
    throw new Error('No video file provided for conversion')
  }

  const formData = new FormData()
  formData.append('video', videoFile)

  const endpoint = `${getBackendBaseUrl()}/api/convert/gif`

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const message = await parseErrorMessage(response)
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  const payload = await response.json()

  return {
    id: payload?.id ?? null,
    type: payload?.type ?? 'gif',
    url: payload?.url ?? null,
    duration: payload?.duration ?? null,
    width: payload?.width ?? null,
    height: payload?.height ?? null,
    size: payload?.size ?? null,
  }
}
