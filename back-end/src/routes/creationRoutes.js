import { Router } from 'express'
import {
    createCreation,
    getCreations,
    getCreationById,
    updateCreation,
    deleteCreation,
} from '../controllers/creationController.js'

const router = Router()

router.post('/api/creations', createCreation)
router.get('/api/creations', getCreations)
router.get('/api/creations/:id', getCreationById)
router.patch('/api/creations/:id', updateCreation)
router.delete('/api/creations/:id', deleteCreation)

export default router