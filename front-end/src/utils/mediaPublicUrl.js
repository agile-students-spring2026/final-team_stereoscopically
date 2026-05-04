/**
 * Avatar and GridFS previews are sometimes stored as absolute URLs pointing at an
 * internal API host (e.g. http://localhost:4000/api/media/...) which breaks behind
 * Nginx/Vite proxy. Same-origin-relative paths fix loading in browsers.
 *
 * Leaves external HTTPS avatars untouched.
 */
export function normalizeUserMediaSrc(url) {
	if (!url || typeof url !== 'string') return url
	if (url.startsWith('blob:') || url.startsWith('data:')) return url
	const needle = '/api/media/'
	if (!url.includes(needle)) return url
	if (url.startsWith('/') && url.includes(needle)) return url

	try {
		const u = new URL(url)
		if (u.pathname.includes(needle)) return `${u.pathname}${u.search}${u.hash}`
	} catch {
		return url
	}
	return url
}
