import { postJson, postMultipart } from './backendMediaClient'

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

  const payload = await postMultipart({
    path: '/api/trim/video',
    fileField: 'video',
    file: videoFile,
    fields: {
      trimStart,
      trimEnd,
    },
    fallbackErrorMessage: 'Video trim failed',
  })

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

  const payload = await postMultipart({
    path: '/api/filter/video',
    fileField: 'video',
    file: videoFile,
    fields: {
      preset,
    },
    fallbackErrorMessage: 'Video filter failed',
  })

  return {
    id: payload?.id ?? null,
    type: payload?.type ?? 'video',
    url: payload?.url ?? null,
    preset: payload?.preset ?? null,
  }
}

export const exportGifToBackend = async (mediaId, playbackRate) => {
  if (!mediaId) throw new Error('Missing media ID for export')

  const payload = { mediaId }
  if (Number.isFinite(playbackRate)) {
    payload.playbackRate = playbackRate
  }

  const responsePayload = await postJson({
    path: '/api/export/gif',
    payload,
    fallbackErrorMessage: 'GIF export failed',
  })

  const result = responsePayload?.data ?? responsePayload
  return {
    id: result?.id ?? null,
    url: result?.url ?? null,
    downloadUrl: result?.downloadUrl ?? null,
  }
}