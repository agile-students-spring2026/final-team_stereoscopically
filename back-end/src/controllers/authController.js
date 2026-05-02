import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'

import { BCRYPT_COST } from '../config/constants.js'
import { User } from '../models/userModel.js'

const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || '7d'

const tokenForUser = (userDoc) =>
	jwt.sign({ sub: userDoc._id.toString() }, process.env.JWT_SECRET, {
		expiresIn: getJwtExpiresIn(),
	})

const defaultDisplayName = (emailLower) => {
	const local = typeof emailLower === 'string' ? emailLower.split('@')[0] : ''
	return local && local.trim() ? local.trim().slice(0, 100) : 'Sticker fan'
}

export const register = async (req, res) => {
	if (!process.env.JWT_SECRET) {
		return res.status(500).json({ error: 'Server JWT configuration missing.' })
	}

	const { email, password, displayName: rawName, bio, avatarUrl } = req.body

	const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
	let displayName = typeof rawName === 'string' && rawName.trim() ? rawName.trim().slice(0, 100) : ''
	displayName = displayName || defaultDisplayName(trimmedEmail)

	const trimmedBio = typeof bio === 'string' ? bio.trim().slice(0, 500) : ''
	const trimmedAvatar =
		typeof avatarUrl === 'string' && avatarUrl.trim()
			? avatarUrl.trim().slice(0, 2048)
			: ''

	let passwordHash
	try {
		passwordHash = await bcrypt.hash(password, BCRYPT_COST)
	} catch {
		return res.status(500).json({ error: 'Could not secure password.' })
	}

	try {
		const userDoc = await User.create({
			email: trimmedEmail,
			passwordHash,
			displayName,
			bio: trimmedBio,
			avatarUrl: trimmedAvatar,
		})

		const token = tokenForUser(userDoc)
		return res.status(201).json({ token })
	} catch (err) {
		if (err instanceof mongoose.Error.ValidationError) {
			return res.status(400).json({
				error: 'Invalid registration data.',
			})
		}
		if (err.code === 11000) {
			return res.status(409).json({ error: 'Email already in use.' })
		}
		console.error('register error:', err)
		return res.status(500).json({ error: 'Registration failed.' })
	}
}

export const login = async (req, res) => {
	if (!process.env.JWT_SECRET) {
		return res.status(500).json({ error: 'Server JWT configuration missing.' })
	}

	const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : ''
	const password = req.body.password

	try {
		const userDoc = await User.findOne({ email })
		const ok = userDoc && (await bcrypt.compare(password, userDoc.passwordHash))

		if (!ok) {
			return res.status(401).json({ error: 'Invalid credentials.' })
		}

		const token = tokenForUser(userDoc)
		return res.status(200).json({ token })
	} catch (err) {
		console.error('login error:', err)
		return res.status(500).json({ error: 'Sign-in failed.' })
	}
}

const profileShape = (doc) => ({
	id: doc._id.toString(),
	email: doc.email,
	username: doc.username ?? '',
	displayName: doc.displayName ?? '',
	avatarUrl: doc.avatarUrl ?? '',
	bio: doc.bio ?? '',
	instagram: doc.instagram ?? '',
	x: doc.x ?? '',
})

const normalizeHandle = (raw) =>
	raw
		.trim()
		.replace(/^@/, '')
		.replace(/^https?:\/\/(www\.)?(instagram|twitter|x)\.com\//i, '')
		.split(/[/?#]/)[0]
		.trim()

export const me = async (req, res) => {
	const doc = req.authUserDoc
	if (!doc) {
		return res.status(401).json({ error: 'Authentication required.' })
	}
	return res.status(200).json(profileShape(doc))
}

export const changeEmail = async (req, res) => {
	if (!process.env.JWT_SECRET) {
		return res.status(500).json({ error: 'Server JWT configuration missing.' })
	}

	const doc = req.authUserDoc
	if (!doc) {
		return res.status(401).json({ error: 'Authentication required.' })
	}

	const nextEmail =
		typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : ''

	if (nextEmail === doc.email) {
		const token = tokenForUser(doc)
		return res.status(200).json({ token })
	}

	try {
		doc.email = nextEmail
		await doc.save()
		const token = tokenForUser(doc)
		return res.status(200).json({ token })
	} catch (err) {
		if (err instanceof mongoose.Error.ValidationError) {
			return res.status(400).json({ error: 'Invalid email.' })
		}
		if (err.code === 11000) {
			return res.status(409).json({ error: 'Email already in use.' })
		}
		console.error('changeEmail error:', err)
		return res.status(500).json({ error: 'Could not change email.' })
	}
}

export const changePassword = async (req, res) => {
	const doc = req.authUserDoc
	if (!doc) {
		return res.status(401).json({ error: 'Authentication required.' })
	}

	const currentPassword = req.body.currentPassword
	const newPassword = req.body.newPassword

	try {
		const userDoc = await User.findById(doc._id).exec()
		if (!userDoc) {
			return res.status(401).json({ error: 'Authentication required.' })
		}

		const currentMatches = await bcrypt.compare(currentPassword, userDoc.passwordHash)
		if (!currentMatches) {
			return res.status(401).json({ error: 'Invalid credentials.' })
		}

		userDoc.passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST)
		await userDoc.save()

		return res.status(200).json({
			message: 'Password changed successfully. You can keep using this session, or sign out if you are on a shared device.',
		})
	} catch (err) {
		console.error('changePassword error:', err)
		return res.status(500).json({ error: 'Could not change password.' })
	}
}

export const verifyCurrentPassword = async (req, res) => {
	const doc = req.authUserDoc
	if (!doc) {
		return res.status(401).json({ error: 'Authentication required.' })
	}

	const currentPassword = req.body.currentPassword

	try {
		const userDoc = await User.findById(doc._id).exec()
		if (!userDoc) {
			return res.status(401).json({ error: 'Authentication required.' })
		}

		const currentMatches = await bcrypt.compare(currentPassword, userDoc.passwordHash)
		if (!currentMatches) {
			return res.status(401).json({ error: 'Invalid credentials.' })
		}

		return res.status(200).json({ message: 'Current password verified.' })
	} catch (err) {
		console.error('verifyCurrentPassword error:', err)
		return res.status(500).json({ error: 'Could not verify current password.' })
	}
}
export const updateMe = async (req, res) => {
	const doc = req.authUserDoc
	if (!doc) {
		return res.status(401).json({ error: 'Authentication required.' })
	}

	const { displayName, username, bio, avatarUrl, instagram, x } = req.body

	if (displayName !== undefined) {
		if (typeof displayName !== 'string' || !displayName.trim()) {
			return res.status(400).json({ error: 'Invalid display name.', code: 'INVALID_DISPLAY_NAME' })
		}
		if (displayName.trim().length > 100) {
			return res.status(400).json({ error: 'Display name too long.', code: 'DISPLAY_NAME_TOO_LONG' })
		}
		doc.displayName = displayName.trim()
	}

	if (username !== undefined) {
		const normalized = typeof username === 'string'
			? username.trim().toLowerCase().replace(/^@/, '')
			: ''
		if (!normalized) {
			return res.status(400).json({ error: 'Username is required.', code: 'INVALID_USERNAME' })
		}
		if (normalized.length < 3 || normalized.length > 30) {
			return res.status(400).json({ error: 'Username must be 3–30 characters.', code: 'USERNAME_LENGTH' })
		}
		if (!/^[a-z0-9_.]+$/.test(normalized)) {
			return res.status(400).json({ error: 'Username may only contain letters, numbers, underscores, and periods.', code: 'USERNAME_FORMAT' })
		}
		if (normalized !== doc.username) {
			const conflict = await User.findOne({ username: normalized, _id: { $ne: doc._id } }).lean()
			if (conflict) {
				return res.status(409).json({ error: 'Username already taken.', code: 'USERNAME_TAKEN' })
			}
		}
		doc.username = normalized
	}

	if (bio !== undefined) {
		if (typeof bio !== 'string') {
			return res.status(400).json({ error: 'Invalid bio.', code: 'INVALID_BIO' })
		}
		if (bio.trim().length > 500) {
			return res.status(400).json({ error: 'Bio too long.', code: 'BIO_TOO_LONG' })
		}
		doc.bio = bio.trim()
	}

	if (avatarUrl !== undefined) {
		if (avatarUrl && !/^https?:\/\/.+/.test(avatarUrl)) {
			return res.status(400).json({ error: 'avatarUrl must be a valid URL.', code: 'INVALID_AVATAR_URL' })
		}
		doc.avatarUrl = typeof avatarUrl === 'string' ? avatarUrl.trim() : ''
	}

	if (instagram !== undefined) {
		const handle = typeof instagram === 'string' ? normalizeHandle(instagram) : ''
		if (handle.length > 50) {
			return res.status(400).json({ error: 'Instagram handle too long.', code: 'INSTAGRAM_TOO_LONG' })
		}
		doc.instagram = handle
	}

	if (x !== undefined) {
		const handle = typeof x === 'string' ? normalizeHandle(x) : ''
		if (handle.length > 50) {
			return res.status(400).json({ error: 'X handle too long.', code: 'X_TOO_LONG' })
		}
		doc.x = handle
	}

	try {
		await doc.save()
		return res.status(200).json(profileShape(doc))
	} catch (err) {
		console.error('updateMe error:', err)
		return res.status(500).json({ error: 'Could not update profile.' })
	}
}
  export const getLikes = async (req, res) => {
	const doc = req.authUserDoc
	if (!doc) {
	  return res.status(401).json({ error: 'Authentication required.' })
	}
  
	const limit = Math.min(parseInt(req.query.limit) || 20, 100)
	const cursor = req.query.cursor || null
  
	const liked = doc.likedStickers || []
	const startIndex = cursor ? liked.indexOf(cursor) + 1 : 0
	const page = liked.slice(startIndex, startIndex + limit)
	const nextCursor = page.length === limit ? page[page.length - 1] : null
  
	return res.status(200).json({
	  items: page,
	  nextCursor,
	})
  }

  export const getUserProfile = async (req, res) => {
	const { userId } = req.params
	
	try {
	  const user = await User.findById(userId)
	  if (!user) {
		return res.status(404).json({ error: 'User not found.' })
	  }
	  return res.status(200).json({
		id: user._id.toString(),
		displayName: user.displayName ?? '',
		avatarUrl: user.avatarUrl ?? '',
		bio: user.bio ?? '',
		instagram: user.instagram ?? '',
		x: user.x ?? '',
	  })
	} catch {
	  return res.status(500).json({ error: 'Could not fetch profile.' })
	}
  }