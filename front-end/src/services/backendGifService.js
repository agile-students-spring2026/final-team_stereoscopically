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
