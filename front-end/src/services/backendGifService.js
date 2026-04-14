import { postMultipart } from './backendMediaClient'

export const convertVideoToGif = async (videoFile) => {
  if (!videoFile) {
    throw new Error('No video file provided for conversion')
  }

  const payload = await postMultipart({
    path: '/api/convert/gif',
    fileField: 'video',
    file: videoFile,
    fallbackErrorMessage: 'GIF conversion failed',
  })

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

export const trimVideoService = async (videoFile, trimStart, trimEnd) => {
  if (!videoFile) {
    throw new Error('No video file provided for trimming')
  }

  const formData = new FormData()
  formData.append('video', videoFile)
  formData.append('trimStart', String(trimStart))
  formData.append('trimEnd', String(trimEnd))

  let response
  try {
    response = await fetch('http://localhost:4000/api/trim/video', {
      method: 'POST',
      body: formData,
    })
  } catch {
    throw new Error('Unable to reach backend. Please make sure the backend server is running.')
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data?.error || 'Video trim failed')
  }

  const payload = await response.json()
  return {
    id: payload?.id ?? null,
    type: payload?.type ?? 'video',
    url: payload?.url ?? null,
    size: payload?.size ?? null,
  }
}

export const applyVideoFilter = async (videoFile, preset) => {
  if (!videoFile) {
    throw new Error('No video file provided')
  }

  const formData = new FormData()
  formData.append('video', videoFile)
  formData.append('preset', preset)

  let response
  try {
    response = await fetch('http://localhost:4000/api/filter/video', {
      method: 'POST',
      body: formData,
    })
  } catch {
    throw new Error('Unable to reach backend. Please make sure the backend server is running.')
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data?.error || 'Video filter failed')
  }

  const payload = await response.json()
  return {
    id: payload?.id ?? null,
    type: payload?.type ?? 'video',
    url: payload?.url ?? null,
    preset: payload?.preset ?? null,
  }
}

export const exportGifToBackend = async (mediaId) => {
  if (!mediaId) throw new Error('Missing media ID for export')

  let response
  try {
    response = await fetch('http://localhost:4000/api/export/gif', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaId }),
    })
  } catch {
    throw new Error('Unable to reach backend. Please make sure the backend server is running.')
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data?.error || 'GIF export failed')
  }

  const payload = await response.json()
  const result = payload?.data ?? payload
  return {
    id: result?.id ?? null,
    url: result?.url ?? null,
    downloadUrl: result?.downloadUrl ?? null,
  }
}