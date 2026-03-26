const createMediaItem = ({
  id,
  type,
  title,
  author,
  previewSrc,
  src,
  width = null,
  height = null,
  duration = null,
  raw = null,
}) => ({
  id,
  type,
  title,
  author,
  previewSrc,
  previewUrl: previewSrc,
  src,
  source: src,
  fullUrl: src,
  width,
  height,
  duration,
  raw,
})

const getPreviewFromImage = (hit) => hit?.previewURL || hit?.webformatURL || hit?.largeImageURL || ''
const getSourceFromImage = (hit, fallbackPreview) =>
  hit?.largeImageURL || hit?.fullHDURL || hit?.webformatURL || fallbackPreview

const getPreviewFromVideo = (videoSources = {}) =>
  videoSources.tiny?.url || videoSources.small?.url || videoSources.medium?.url || ''
const getSourceFromVideo = (videoSources = {}, fallbackPreview) =>
  videoSources.large?.url || videoSources.medium?.url || videoSources.small?.url || fallbackPreview

const normalizePixabayImageHits = (hits = []) =>
  hits.map((hit, index) => {
    const previewSrc = getPreviewFromImage(hit)
    const src = getSourceFromImage(hit, previewSrc)

    return createMediaItem({
      id: hit?.id ?? `pixabay-image-${index}`,
      type: 'image',
      title: hit?.tags || `Image ${index + 1}`,
      author: hit?.user || 'Unknown',
      previewSrc,
      src,
      width: hit?.imageWidth ?? hit?.webformatWidth ?? null,
      height: hit?.imageHeight ?? hit?.webformatHeight ?? null,
      raw: hit ?? null,
    })
  })

const normalizePixabayVideoHits = (hits = []) =>
  hits.map((hit, index) => {
    const videoSources = hit?.videos || {}
    const previewSrc = getPreviewFromVideo(videoSources)
    const src = getSourceFromVideo(videoSources, previewSrc)

    return createMediaItem({
      id: hit?.id ?? `pixabay-video-${index}`,
      type: 'video',
      title: hit?.tags || `Video ${index + 1}`,
      author: hit?.user || 'Unknown',
      previewSrc,
      src,
      duration: hit?.duration ?? null,
      raw: hit ?? null,
    })
  })

export { normalizePixabayImageHits, normalizePixabayVideoHits }
