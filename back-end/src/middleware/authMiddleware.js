import jwt from 'jsonwebtoken'

import { User } from '../models/userModel.js'

export const requireAuth = async (req, res, next) => {
	const header = req.headers.authorization || ''
	const parts = header.split(' ')
	if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer' || !parts[1]?.trim()) {
		return res.status(401).json({ error: 'Authentication required.' })
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
		next()
	} catch {
		return res.status(401).json({ error: 'Invalid or expired token.' })
	}
}
