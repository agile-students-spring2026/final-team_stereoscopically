export const derivePreviewUrl = (mediaItem, explicitPreview) => {
	if (explicitPreview) return explicitPreview
	if (!mediaItem) return null
	return (
		mediaItem.previewSrc ||
		mediaItem.previewUrl ||
		mediaItem.src ||
		mediaItem.fullUrl ||
		mediaItem.source ||
		null
	)
}

export const deriveSourceUrl = (mediaItem, explicitSource, fallbackPreview) => {
	if (explicitSource) return explicitSource
	if (!mediaItem) return fallbackPreview || null
	return mediaItem.src || mediaItem.fullUrl || mediaItem.source || fallbackPreview || null
}
