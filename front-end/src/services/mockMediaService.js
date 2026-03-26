import { normalizePixabayImageHits, normalizePixabayVideoHits } from './mediaNormalizer'

const MOCK_BASE_PATH = '/mock/pixabay';
const RESOURCE_FILES = {
  images: 'images.json',
  videos: 'videos.json',
};
const DEFAULT_QUERY = 'editorial';

const buildMockUrl = (resource, query) => {
  const path = RESOURCE_FILES[resource];
  const params = new URLSearchParams();

  if (query) {
    params.set('q', query);
  }

  return `${MOCK_BASE_PATH}/${path}${params.toString() ? `?${params}` : ''}`;
};

const parseMockPayload = async (response, type) => {
  try {
    const payload = await response.json();
    const hits = Array.isArray(payload?.hits) ? payload.hits : [];

    return type === 'image' ? normalizePixabayImageHits(hits) : normalizePixabayVideoHits(hits);
  } catch (error) {
    console.error('[mockMediaService] Failed to parse mock payload', error);
    return [];
  }
};

const fetchMockMedia = async (resource, query = DEFAULT_QUERY) => {
  const url = buildMockUrl(resource, query);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[mockMediaService] ${resource} request failed (${response.status})`);
      return [];
    }

    return parseMockPayload(response, resource === 'images' ? 'image' : 'video');
  } catch (error) {
    console.error(`[mockMediaService] Unable to fetch ${resource}`, error);
    return [];
  }
};

export const fetchMockImages = async (query) => fetchMockMedia('images', query);
export const fetchMockVideos = async (query) => fetchMockMedia('videos', query);
