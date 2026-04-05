import { normalizePixabayImageHits } from './mediaNormalizer'

const PIXABAY_IMAGE_ENDPOINT = 'https://pixabay.com/api/'
const DEFAULT_SEARCH_QUERY = 'editorial'

const DEFAULT_IMAGE_PARAMS = {
  image_type: 'photo',
  orientation: 'horizontal',
  per_page: 24,
  safesearch: true,
}

const getPixabayApiKey = () => {
  const key = import.meta.env?.VITE_PIXABAY_API_KEY?.trim()

  if (!key) {
    console.error('[pixabayService] Missing VITE_PIXABAY_API_KEY. Please set it in your environment.')
  }

  return key
}

const buildSearchParams = (apiKey, params = {}) => {
  const searchParams = new URLSearchParams({ key: apiKey, ...params })
  return searchParams.toString()
}

const requestPixabay = async (endpoint, params) => {
  const apiKey = getPixabayApiKey()

  if (!apiKey) {
    return []
  }

  const url = `${endpoint}?${buildSearchParams(apiKey, params)}`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      console.error(`[pixabayService] image request failed (${response.status})`)
      return []
    }

    const payload = await response.json()
    const hits = Array.isArray(payload?.hits) ? payload.hits : []

    return normalizePixabayImageHits(hits)
  } catch (error) {
    console.error('[pixabayService] Unable to fetch image data', error)
    return []
  }
}

export const fetchPixabayImages = async (query = DEFAULT_SEARCH_QUERY, overrides = {}) =>
  requestPixabay(
    PIXABAY_IMAGE_ENDPOINT,
    {
      q: query || DEFAULT_SEARCH_QUERY,
      ...DEFAULT_IMAGE_PARAMS,
      ...overrides,
    }
  )
