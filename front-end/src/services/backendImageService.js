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

export const adjustImageFromBackend = async ({
  mediaId,
  brightness = 1,
  contrast = 1,
  saturation = 1,
  hue = 0,
  grayscale = 0,
  sepia = 0,
  sharpness = 1,
}) => {
  const payload = await postJson({
    path: '/api/adjust/image',
    payload: { mediaId, brightness, contrast, saturation, hue, grayscale, sepia, sharpness },
    fallbackErrorMessage: 'Image adjustment failed',
  })
  return {
    id: payload?.id ?? null,
    type: payload?.type ?? 'image',
    url: payload?.url ?? null,
    mimeType: payload?.mimeType ?? 'image/png',
    size: payload?.size ?? null,
    width: payload?.width ?? null,
    height: payload?.height ?? null,
  }
}

export const applyPresetImageFilterFromBackend = async ({ mediaId, preset }) => {
  const payload = await postJson({
    path: '/api/filter/image',
    payload: { mediaId, preset },
    fallbackErrorMessage: 'Preset filter failed',
  })
  return {
    id: payload?.id ?? null,
    type: payload?.type ?? 'image',
    url: payload?.url ?? null,
    mimeType: payload?.mimeType ?? 'image/png',
    size: payload?.size ?? null,
    width: payload?.width ?? null,
    height: payload?.height ?? null,
    preset: payload?.preset ?? preset,
  }
}

export const cropImageFromBackend = async ({ mediaId, x, y, width, height, unit = 'ratio' }) => {
  const payload = await postJson({
    path: '/api/crop/image',
    payload: { mediaId, x, y, width, height, unit },
    fallbackErrorMessage: 'Image crop failed',
  })
  return {
    id: payload?.id ?? null,
    type: payload?.type ?? 'image',
    url: payload?.url ?? null,
    mimeType: payload?.mimeType ?? 'image/png',
    size: payload?.size ?? null,
    width: payload?.width ?? null,
    height: payload?.height ?? null,
  }
}

export const addTextToImageFromBackend = async ({
  mediaId,
  text,
  x,
  y,
  fontFamily = 'Arial',
  fontSize = 36,
  color = '#FFFFFF',
}) => {
  const payload = await postJson({
    path: '/api/text/image',
    payload: { mediaId, text, x, y, fontFamily, fontSize, color },
    fallbackErrorMessage: 'Add text failed',
  })

  return {
    id: payload?.id ?? null,
    type: payload?.type ?? 'image',
    url: payload?.url ?? null,
    mimeType: payload?.mimeType ?? 'image/png',
    size: payload?.size ?? null,
    width: payload?.width ?? null,
    height: payload?.height ?? null,
    noOp: payload?.noOp ?? false,
  }
}

export const convertBackendImageResultToLocalMedia = async (
  result,
  {
    fallbackFileName = 'sticker.png',
    fallbackMimeType = 'image/png',
    fetchErrorMessage = 'Failed to load exported image preview.',
  } = {}
) => {
  const sourceUrl = result?.url
  if (!sourceUrl) {
    throw new Error(fetchErrorMessage)
  }

  const response = await fetch(sourceUrl)
  if (!response.ok) {
    throw new Error(fetchErrorMessage)
  }

  const blob = await response.blob()
  const fileName = result?.fileName || fallbackFileName
  const mimeType = result?.mimeType || blob.type || fallbackMimeType
  const file = new File([blob], fileName, { type: mimeType })
  const objectUrl = URL.createObjectURL(blob)

  return {
    file,
    objectUrl,
    fileName,
    mimeType,
  }
}