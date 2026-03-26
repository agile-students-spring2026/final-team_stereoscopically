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

const normalizeMediaItems = (hits = [], type) =>
  hits.map((hit, index) => {
    const fallbackId = `${type}-${index}`;

    if (type === 'image') {
      return {
        id: hit?.id ?? fallbackId,
        type,
        title: hit?.tags || `Image ${index + 1}`,
        previewUrl: hit?.previewURL || hit?.largeImageURL,
        fullUrl: hit?.largeImageURL || hit?.fullHDURL || hit?.previewURL,
        author: hit?.user || 'Unknown',
      };
    }

    const videoSources = hit?.videos || {};

    return {
      id: hit?.id ?? fallbackId,
      type,
      title: hit?.tags || `Video ${index + 1}`,
      previewUrl: videoSources.tiny?.url || videoSources.small?.url,
      fullUrl: videoSources.large?.url || videoSources.medium?.url || videoSources.small?.url,
      author: hit?.user || 'Unknown',
    };
  });

const parseMockPayload = async (response, type) => {
  try {
    const payload = await response.json();
    const hits = Array.isArray(payload?.hits) ? payload.hits : [];

    return normalizeMediaItems(hits, type);
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
