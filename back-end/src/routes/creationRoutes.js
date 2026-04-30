import { Router } from 'express'
import {
    createCreation,
    getCreations,
    getCreationById,
    updateCreation,
    deleteCreation,
} from '../controllers/creationController.js'
import { optionalAuth } from '../middleware/optionalAuth.js'

const router = Router()

router.post('/api/creations', optionalAuth, createCreation)
router.get('/api/creations', optionalAuth, getCreations)
router.get('/api/creations/:id', optionalAuth, getCreationById)
router.patch('/api/creations/:id', optionalAuth, updateCreation)
router.delete('/api/creations/:id', optionalAuth, deleteCreation)

export default router