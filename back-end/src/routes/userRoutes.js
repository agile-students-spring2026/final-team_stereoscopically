import { Router } from 'express'

import {
	followUser,
	getFollowing,
	getHomeFeed,
	getPublicUserProfile,
	getUserPublishedCreations,
	searchUsers,
	unfollowUser,
} from '../controllers/userController.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { optionalAuth } from '../middleware/optionalAuth.js'

const router = Router()

router.get('/api/users/search', requireAuth, searchUsers)
router.get('/api/users/:username', optionalAuth, getPublicUserProfile)
router.get('/api/users/:username/creations', optionalAuth, getUserPublishedCreations)
router.post('/api/users/:userId/follow', requireAuth, followUser)
router.delete('/api/users/:userId/follow', requireAuth, unfollowUser)
router.get('/api/me/following', requireAuth, getFollowing)
router.get('/api/me/feed', requireAuth, getHomeFeed)

export default router
