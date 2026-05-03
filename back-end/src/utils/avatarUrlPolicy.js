/**
 * Avatars may be external HTTPS, or same-origin paths from our upload pipeline
 * ({@link buildMediaUrl} → `/api/media/<ObjectId>`).
 */
export const isAllowedAvatarUrl = (value) => {
	if (value === undefined || value === null) return true
	if (typeof value !== 'string') return false
	const t = value.trim()
	if (!t) return true
	if (/^https?:\/\/.+/i.test(t)) return true
	if (/^\/api\/media\/[a-f0-9]{24}$/i.test(t)) return true
	return false
}
