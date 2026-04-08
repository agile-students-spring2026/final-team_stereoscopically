import { postJson, postMultipart } from './backendMediaClient'

export const uploadImageToBackend = async (imageFile) => {
  if (!imageFile) {
    throw new Error('No image file provided for upload')
  }

  const payload = await postMultipart({
    path: '/api/upload/image',
    fileField: 'file',
    file: imageFile,
    fallbackErrorMessage: 'Image upload failed',
  })

  return {
    id: payload?.id ?? null,
    type: payload?.type ?? 'image',
    url: payload?.url ?? null,
    mimeType: payload?.mimeType ?? null,
    width: payload?.width ?? null,
    height: payload?.height ?? null,
    size: payload?.size ?? null,
  }
}

export const exportImageFromBackend = async ({ mediaId, width, height, letterboxColor = 'transparent' }) => {
  const payload = await postJson({
    path: '/api/export/image',
    payload: { mediaId, width, height, letterboxColor },
    fallbackErrorMessage: 'Image export failed',
  })

  return {
    id: payload?.id ?? null,
    type: payload?.type ?? 'image',
    url: payload?.url ?? null,
    downloadUrl: payload?.downloadUrl ?? null,
    mimeType: payload?.mimeType ?? 'image/png',
    width: payload?.width ?? null,
    height: payload?.height ?? null,
    size: payload?.size ?? null,
    fileName: payload?.fileName ?? 'sticker.png',
  }
}

export const cropImageFromBackend = async ({ mediaId, x, y, width, height, scaleX, scaleY }) => {
  const payload = await postJson({
    path: '/api/crop/image',
    payload: { mediaId, x, y, width, height, scaleX, scaleY },
    fallbackErrorMessage: 'Image crop failed',
  })
  return {
    id: payload?.id ?? null,
    type: payload?.type ?? 'image',
    url: payload?.url ?? null,
    mimeType: payload?.mimeType ?? 'image/png',
    size: payload?.size ?? null,
  }
}