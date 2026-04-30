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

export const me = async (req, res) => {
	const doc = req.authUserDoc
	if (!doc) {
		return res.status(401).json({ error: 'Authentication required.' })
	}

	return res.status(200).json({
		id: doc._id.toString(),
		email: doc.email,
		displayName: doc.displayName ?? '',
		avatarUrl: doc.avatarUrl ?? '',
		bio: doc.bio ?? '',
	})
}
