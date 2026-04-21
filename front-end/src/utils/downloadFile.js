/**
 * Trigger a browser file download from a URL
 *
 * @param {string} url - The file URL to download
 * @param {string} filename - The filename to use for the download
 *
 * @throws {Error} if url or filename are not provided
 */
export const downloadFile = (url, filename = 'download') => {
  if (!url) {
    throw new Error('Download URL is required')
  }
  if (!filename) {
    throw new Error('Filename is required')
  }

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
