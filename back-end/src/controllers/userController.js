import mongoose from 'mongoose'

import { User } from '../models/userModel.js'
import { Creation } from '../models/creationModel.js'

const publicProfileShape = (doc, followingSet) => ({
	id: doc._id.toString(),
	username: doc.username ?? '',
	displayName: doc.displayName ?? '',
	avatarUrl: doc.avatarUrl ?? '',
	bio: doc.bio ?? '',
	instagram: doc.instagram ?? '',
	x: doc.x ?? '',
	isFollowing: followingSet ? followingSet.has(doc._id.toString()) : false,
})

export const searchUsers = async (req, res) => {
	const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
	if (!q) {
		return res.status(200).json({ users: [] })
	}

	const currentUserId = req.authUserId

	try {
		const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
		const docs = await User.find({
			_id: { $ne: currentUserId },
			username: { $regex: regex, $ne: '' },
		})
			.select('_id username displayName avatarUrl bio instagram x')
			.limit(20)
			.lean()

		const currentUser = req.authUserDoc
		const followingSet = new Set((currentUser.following || []).map((id) => id.toString()))

		return res.status(200).json({
			users: docs.map((doc) => publicProfileShape(doc, followingSet)),
		})
	} catch (err) {
		console.error('searchUsers error:', err)
		return res.status(500).json({ error: 'Search failed.' })
	}
}

export const followUser = async (req, res) => {
	const currentUserId = req.authUserId
	const { userId } = req.params

	if (!mongoose.Types.ObjectId.isValid(userId)) {
		return res.status(400).json({ error: 'Invalid user ID.' })
	}

	if (userId === currentUserId.toString()) {
		return res.status(400).json({ error: 'Cannot follow yourself.' })
	}

	try {
		const target = await User.findById(userId).select('_id').lean()
		if (!target) {
			return res.status(404).json({ error: 'User not found.' })
		}

		await User.updateOne(
			{ _id: currentUserId },
			{ $addToSet: { following: userId } }
		)

		return res.status(200).json({ followed: true })
	} catch (err) {
		console.error('followUser error:', err)
		return res.status(500).json({ error: 'Could not follow user.' })
	}
}

export const unfollowUser = async (req, res) => {
	const currentUserId = req.authUserId
	const { userId } = req.params

	if (!mongoose.Types.ObjectId.isValid(userId)) {
		return res.status(400).json({ error: 'Invalid user ID.' })
	}

	try {
		await User.updateOne(
			{ _id: currentUserId },
			{ $pull: { following: new mongoose.Types.ObjectId(userId) } }
		)

		return res.status(200).json({ unfollowed: true })
	} catch (err) {
		console.error('unfollowUser error:', err)
		return res.status(500).json({ error: 'Could not unfollow user.' })
	}
}

export const getFollowing = async (req, res) => {
	const currentUser = req.authUserDoc

	try {
		const followingIds = currentUser.following || []
		if (followingIds.length === 0) {
			return res.status(200).json({ users: [] })
		}

		const docs = await User.find({ _id: { $in: followingIds } })
			.select('_id username displayName avatarUrl bio instagram x')
			.lean()

		const followingSet = new Set(followingIds.map((id) => id.toString()))

		return res.status(200).json({
			users: docs.map((doc) => publicProfileShape(doc, followingSet)),
		})
	} catch (err) {
		console.error('getFollowing error:', err)
		return res.status(500).json({ error: 'Could not fetch following list.' })
	}
}

export const getPublicUserProfile = async (req, res) => {
	const { username } = req.params
	const normalized = typeof username === 'string' ? username.trim().toLowerCase() : ''

	if (!normalized) {
		return res.status(404).json({ error: 'User not found.' })
	}

	try {
		const doc = await User.findOne({ username: normalized })
			.select('_id username displayName avatarUrl bio instagram x')
			.lean()

		if (!doc) {
			return res.status(404).json({ error: 'User not found.' })
		}

		const currentUser = req.authUserDoc
		const followingSet = currentUser
			? new Set((currentUser.following || []).map((id) => id.toString()))
			: new Set()

		return res.status(200).json(publicProfileShape(doc, followingSet))
	} catch (err) {
		console.error('getPublicUserProfile error:', err)
		return res.status(500).json({ error: 'Could not fetch profile.' })
	}
}

const MAX_SAVED_FEED_CREATIONS = 500

export const getHomeFeed = async (req, res) => {
	const currentUser = req.authUserDoc

	try {
		const followingIds = currentUser.following || []

		const me = await User.findById(currentUser._id).select('savedFeedCreations').lean()
		const savedSet = new Set((me?.savedFeedCreations || []).map((id) => id.toString()))

		const creations = await Creation.find({
			userId: { $in: followingIds },
			status: 'published',
		})
			.sort({ publishedAt: -1 })
			.limit(50)
			.populate('userId', '_id username displayName avatarUrl')
			.lean()

		const withSaved = creations.map((c) => ({
			...c,
			isSaved: savedSet.has(c._id.toString()),
		}))

		return res.status(200).json({ creations: withSaved })
	} catch (err) {
		console.error('getHomeFeed error:', err)
		return res.status(500).json({ error: 'Could not fetch feed.' })
	}
}

export const saveFeedCreation = async (req, res) => {
	const currentUser = req.authUserDoc
	const { creationId } = req.params

	if (!mongoose.Types.ObjectId.isValid(creationId)) {
		return res.status(400).json({ error: 'Invalid creation id.' })
	}

	try {
		const followingIds = new Set((currentUser.following || []).map((id) => id.toString()))

		const creation = await Creation.findById(creationId).select('userId status').lean()
		if (!creation || creation.status !== 'published') {
			return res.status(404).json({ error: 'Creation not found.' })
		}

		const authorId = creation.userId?.toString()
		if (!authorId || !followingIds.has(authorId)) {
			return res
				.status(403)
				.json({ error: 'You can only save published stickers from creators you follow.' })
		}

		if (authorId === currentUser._id.toString()) {
			return res.status(400).json({ error: 'Use My Creations for your own work.' })
		}

		const count = await User.findById(currentUser._id).select('savedFeedCreations').lean()
		const n = count?.savedFeedCreations?.length ?? 0
		if (n >= MAX_SAVED_FEED_CREATIONS) {
			return res.status(400).json({ error: 'Saved list is full. Remove some to add more.' })
		}

		await User.updateOne({ _id: currentUser._id }, { $addToSet: { savedFeedCreations: creationId } })

		return res.status(200).json({ saved: true })
	} catch (err) {
		console.error('saveFeedCreation error:', err)
		return res.status(500).json({ error: 'Could not save sticker.' })
	}
}

export const unsaveFeedCreation = async (req, res) => {
	const currentUser = req.authUserDoc
	const { creationId } = req.params

	if (!mongoose.Types.ObjectId.isValid(creationId)) {
		return res.status(400).json({ error: 'Invalid creation id.' })
	}

	try {
		await User.updateOne({ _id: currentUser._id }, { $pull: { savedFeedCreations: creationId } })
		return res.status(200).json({ saved: false })
	} catch (err) {
		console.error('unsaveFeedCreation error:', err)
		return res.status(500).json({ error: 'Could not remove saved sticker.' })
	}
}

export const getUserPublishedCreations = async (req, res) => {
	const { username } = req.params
	const normalized = typeof username === 'string' ? username.trim().toLowerCase() : ''

	if (!normalized) {
		return res.status(404).json({ error: 'User not found.' })
	}

	try {
		const doc = await User.findOne({ username: normalized })
			.select('_id')
			.lean()

		if (!doc) {
			return res.status(404).json({ error: 'User not found.' })
		}

		const creations = await Creation.find({
			userId: doc._id,
			status: 'published',
		})
			.sort({ publishedAt: -1 })
			.limit(50)
			.lean()

		return res.status(200).json({ creations })
	} catch (err) {
		console.error('getUserPublishedCreations error:', err)
		return res.status(500).json({ error: 'Could not fetch creations.' })
	}
}

