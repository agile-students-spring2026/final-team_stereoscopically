// Utility to check if a video type is supported by the browser
export function isVideoTypeSupported(file) {
  if (!(file instanceof File)) return false
  const video = document.createElement('video')
  const mimeType = file.type
  if (!mimeType) return false
  return video.canPlayType(mimeType) !== ''
}