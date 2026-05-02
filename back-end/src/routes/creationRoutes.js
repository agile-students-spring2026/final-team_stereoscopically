import { Router } from 'express'
import {
    createCreation,
    getCreations,
    getCreationById,
    updateCreation,
    deleteCreation,
    publishCreation,
    unpublishCreation,
    likeCreation,
    unlikeCreation,
} from '../controllers/creationController.js'
import { optionalAuth } from '../middleware/optionalAuth.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = Router()

router.post('/api/creations', optionalAuth, createCreation)
router.get('/api/creations', optionalAuth, getCreations)
router.get('/api/creations/:id', optionalAuth, getCreationById)
router.patch('/api/creations/:id', optionalAuth, updateCreation)
router.delete('/api/creations/:id', optionalAuth, deleteCreation)
router.post('/api/creations/:id/publish', requireAuth, publishCreation)
router.post('/api/creations/:id/unpublish', requireAuth, unpublishCreation)
router.post('/api/creations/:id/like', requireAuth, likeCreation)
router.post('/api/creations/:id/unlike', requireAuth, unlikeCreation)

export default router