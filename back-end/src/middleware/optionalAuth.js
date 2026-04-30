import jwt from 'jsonwebtoken'

import { User } from '../models/userModel.js'

/**
 * Attach `req.authUserId` / `req.authUserDoc` when Authorization Bearer is valid.
 * Missing or unparsable Bearer is treated as guest (no attachment).
 * Malformed Bearer (present but invalid) returns 401.
 */
export const optionalAuth = async (req, res, next) => {
	const header = req.headers.authorization || ''
	const parts = header.split(' ')
	if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer' || !parts[1]?.trim()) {
		return next()
	}

	const token = parts[1].trim()

	if (!process.env.JWT_SECRET) {
		return res.status(500).json({ error: 'Server JWT configuration missing.' })
	}

	try {
		const payload = jwt.verify(token, process.env.JWT_SECRET)
		const userId =
			payload && typeof payload.sub === 'string'
				? payload.sub.trim()
				: payload && typeof payload.userId === 'string'
					? payload.userId.trim()
					: ''

		if (!userId) {
			return res.status(401).json({ error: 'Invalid token.' })
		}

		const userDoc = await User.findById(userId).select('-passwordHash').exec()
		if (!userDoc) {
			return res.status(401).json({ error: 'Invalid token.' })
		}

		req.authUserId = userId
		req.authUserDoc = userDoc
	} catch {
		return res.status(401).json({ error: 'Invalid or expired token.' })
	}

	next()
}
