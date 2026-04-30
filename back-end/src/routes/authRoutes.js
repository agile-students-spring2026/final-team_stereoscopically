import { Router } from 'express'
import { body } from 'express-validator'

import { login, me, register } from '../controllers/authController.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { handleValidationErrors } from '../middleware/validateRequest.js'

const router = Router()

const registerBody = [
	body('email').trim().normalizeEmail().isEmail().withMessage('Valid email required'),
	body('password')
		.isString()
		.isLength({ min: 8, max: 128 })
		.withMessage('Password must be between 8 and 128 characters'),
	body('displayName')
		.optional()
		.isString()
		.trim()
		.isLength({ max: 100 })
		.withMessage('Display name too long'),
	body('bio')
		.optional()
		.isString()
		.trim()
		.isLength({ max: 500 })
		.withMessage('Bio too long'),
	body('avatarUrl')
		.optional()
		.isString()
		.trim()
		.custom((value) => {
			if (!value) return true
			try {
				const u = new URL(value)
				return Boolean(u.protocol === 'http:' || u.protocol === 'https:')
			} catch {
				throw new Error('avatarUrl must be a valid HTTP or HTTPS URL')
			}
		}),
]

const loginBody = [
	body('email').trim().normalizeEmail().isEmail().withMessage('Valid email required'),
	body('password').isString().notEmpty().withMessage('Password required'),
]

const registerMiddleware = [...registerBody, handleValidationErrors, register]
const loginMiddleware = [...loginBody, handleValidationErrors, login]

router.post('/api/auth/register', ...registerMiddleware)
router.post('/api/auth/signup', ...registerMiddleware)
router.post('/api/auth/login', ...loginMiddleware)
router.post('/api/auth/signin', ...loginMiddleware)
router.get('/api/me', requireAuth, me)

export default router
