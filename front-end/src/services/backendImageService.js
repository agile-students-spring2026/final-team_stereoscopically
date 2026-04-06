import { postMultipart } from './backendMediaClient'

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
