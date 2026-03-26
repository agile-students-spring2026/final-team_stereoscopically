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

const derivePreviewUrl = (mediaItem = {}) =>
  mediaItem.previewSrc || mediaItem.previewUrl || mediaItem.src || mediaItem.fullUrl || null;

const deriveSourceUrl = (mediaItem = {}, fallbackPreview = null) =>
  mediaItem.src || mediaItem.fullUrl || fallbackPreview || null;

const MEDIA_TYPE_META = {
  image: {
    fetcher: fetchMockImages,
    emptyMessage: 'No mock image media available yet.',
  },
  video: {
    fetcher: fetchMockVideos,
    emptyMessage: 'No mock video media available yet.',
  },
};

export const resolveMockMediaSelection = async (preferredType = 'image') => {
  const normalizedType = preferredType === 'video' || preferredType === 'gif' ? 'video' : 'image';
  const { fetcher, emptyMessage } = MEDIA_TYPE_META[normalizedType];

  try {
    const mediaItems = await fetcher();
    const firstItem = mediaItems?.[0];

    if (!firstItem) {
      return {
        fileType: normalizedType,
        selectedFile: null,
        previewUrl: null,
        sourceUrl: null,
        error: emptyMessage,
      };
    }

    const previewUrl = derivePreviewUrl(firstItem);
    const sourceUrl = deriveSourceUrl(firstItem, previewUrl);

    return {
      fileType: normalizedType,
      selectedFile: { ...firstItem, isMock: true },
      previewUrl,
      sourceUrl,
      error: null,
    };
  } catch (error) {
    console.error('[mockMediaService] Unable to resolve mock media selection', error);
    return {
      fileType: normalizedType,
      selectedFile: null,
      previewUrl: null,
      sourceUrl: null,
      error: 'Failed to load sample media. Please try uploading your own file instead.',
    };
  }
};
