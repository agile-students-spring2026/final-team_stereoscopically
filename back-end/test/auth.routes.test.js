import { expect } from 'chai'
import mongoose from 'mongoose'
import request from 'supertest'

import app from '../server.js'
import { connectToDatabase } from '../src/config/database.js'
import { User } from '../src/models/userModel.js'

const runAuthIntegration = !!(process.env.MONGODB_URI && process.env.JWT_SECRET)

;(runAuthIntegration ? describe : describe.skip)('Authentication API (#155 #169)', function () {
	this.timeout(20_000)

	before(async () => {
		if (mongoose.connection.readyState !== 1) {
			await connectToDatabase()
		}
	})

	const uniqEmail = () =>
		`auth-test-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`

	it('POST /api/auth/register returns JWT (201)', async () => {
		const email = uniqEmail()
		const res = await request(app).post('/api/auth/register').send({
			email,
			password: 'correcthorse',
			displayName: 'Route Test User',
			bio: 'Hi',
			avatarUrl: 'https://example.com/a.png',
		})

		expect(res.status).to.equal(201)
		expect(res.body).to.have.property('token').that.is.a('string').with.length.gt(12)
		await User.deleteOne({ email: email.trim().toLowerCase() })
	})

	it('POST /api/auth/signup matches register behavior', async () => {
		const email = uniqEmail()
		const res = await request(app).post('/api/auth/signup').send({
			email,
			password: 'correcthorse',
		})

		expect(res.status).to.equal(201)
		expect(res.body).to.have.property('token')
		await User.deleteOne({ email: email.trim().toLowerCase() })
	})

	it('rejects duplicate email (409)', async () => {
		const email = uniqEmail()
		const first = await request(app).post('/api/auth/register').send({
			email,
			password: 'correcthorse',
		})

		expect(first.status).to.equal(201)

		const dup = await request(app).post('/api/auth/register').send({
			email,
			password: 'anotherpwd1',
		})

		expect(dup.status).to.equal(409)
		expect(dup.body.error).to.match(/already|use/i)

		await User.deleteOne({ email: email.trim().toLowerCase() })
	})

	it('POST /api/auth/login returns token when password matches', async () => {
		const email = uniqEmail()

		await request(app).post('/api/auth/register').send({
			email,
			password: 'matchingpwd1',
		})

		const res = await request(app).post('/api/auth/login').send({
			email,
			password: 'matchingpwd1',
		})

		expect(res.status).to.equal(200)
		expect(res.body).to.have.property('token')

		await User.deleteOne({ email: email.trim().toLowerCase() })
	})

	it('POST /api/auth/signin matches login behavior', async () => {
		const email = uniqEmail()

		await request(app).post('/api/auth/register').send({
			email,
			password: 'signinPWD1!',
		})

		const res = await request(app).post('/api/auth/signin').send({
			email,
			password: 'signinPWD1!',
		})

		expect(res.status).to.equal(200)
		expect(res.body).to.have.property('token')

		await User.deleteOne({ email: email.trim().toLowerCase() })
	})

	it('blocks login when password incorrect (401)', async () => {
		const email = uniqEmail()

		await request(app).post('/api/auth/register').send({
			email,
			password: 'rightpassword1',
		})

		const res = await request(app).post('/api/auth/login').send({
			email,
			password: 'wrongpassword!',
		})

		expect(res.status).to.equal(401)
		expect(res.body.error).to.match(/invalid/i)

		await User.deleteOne({ email: email.trim().toLowerCase() })
	})

	it('GET /api/me requires Bearer token', async () => {
		const res = await request(app).get('/api/me')
		expect(res.status).to.equal(401)
	})

	it('GET /api/me returns profile with valid token', async () => {
		const email = uniqEmail()

		const reg = await request(app).post('/api/auth/register').send({
			email,
			password: 'profilePwd1!',
			displayName: 'Me Tester',
			bio: 'Hello',
			avatarUrl: 'https://example.com/p.png',
		})

		const token = reg.body.token

		const res = await request(app).get('/api/me').set('Authorization', `Bearer ${token}`)

		expect(res.status).to.equal(200)
		expect(res.body).to.include.keys('id', 'email', 'displayName', 'bio', 'avatarUrl')
		expect(res.body.email).to.equal(email.trim().toLowerCase())
		expect(res.body.displayName).to.equal('Me Tester')

		await User.deleteOne({ email: email.trim().toLowerCase() })
	})
})
