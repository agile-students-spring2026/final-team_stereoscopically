/** Guest drafts have ownerKey only; authenticated drafts store userId. */
export const guestCanAccessCreation = (creation, ownerKeyTrimmed) => {
	if (!ownerKeyTrimmed) return false
	if (creation.userId) return false
	const key =
		typeof creation.ownerKey === 'string'
			? creation.ownerKey.trim()
			: creation.ownerKey
				? String(creation.ownerKey).trim()
				: ''
	return Boolean(key && key === ownerKeyTrimmed)
}

export const userOwnsCreation = (creation, userDoc) => {
	if (!userDoc || !creation.userId) return false
	return creation.userId.equals(userDoc._id)
}
