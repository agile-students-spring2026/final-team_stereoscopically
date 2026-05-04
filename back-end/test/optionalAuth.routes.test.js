import { expect } from 'chai'
import request from 'supertest'

import app from '../server.js'

describe('optionalAuth on public profile route', () => {
	it('returns 401 when Bearer token is present but invalid', async () => {
		const res = await request(app)
			.get('/api/users/nouser')
			.set('Authorization', 'Bearer not-a-valid-jwt-at-all')

		expect(res.status).to.equal(401)
	})
})
