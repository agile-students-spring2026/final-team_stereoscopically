import { expect } from 'chai'
import mongoose from 'mongoose'
import request from 'supertest'

import app from '../server.js'
import { connectToDatabase } from '../src/config/database.js'
import { Creation } from '../src/models/creationModel.js'
import { User } from '../src/models/userModel.js'

const run = !!(process.env.MONGODB_URI && process.env.JWT_SECRET)

;(run ? describe : describe.skip)('Creations + feed saved stickers (integration)', function () {
	this.timeout(30_000)

	before(async () => {
		if (mongoose.connection.readyState !== 1) {
			await connectToDatabase()
		}
	})

	const uniqEmail = () =>
		`feed-test-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`

	it('signed-in user can create and list drafts', async () => {
		const email = uniqEmail()
		const reg = await request(app).post('/api/auth/register').send({
			email,
			password: 'correcthorse',
		})
		const token = reg.body.token

		const created = await request(app)
			.post('/api/creations')
			.set('Authorization', `Bearer ${token}`)
			.send({
				title: 'Draft one',
				editorPayload: { kind: 'image', version: 1, sourceMediaId: '507f1f77bcf86cd799439011' },
				status: 'draft',
			})

		expect(created.status).to.equal(201)

		const list = await request(app).get('/api/creations').set('Authorization', `Bearer ${token}`)

		expect(list.status).to.equal(200)
		expect(list.body).to.be.an('array').with.length.at.least(1)

		await Creation.deleteOne({ _id: created.body._id })
		await User.deleteOne({ email: email.trim().toLowerCase() })
	})

	it('feed exposes isSaved and save/unsave toggles', async () => {
		const emailA = uniqEmail()
		const emailB = uniqEmail()

		const regA = await request(app).post('/api/auth/register').send({
			email: emailA,
			password: 'correcthorse',
		})
		const regB = await request(app).post('/api/auth/register').send({
			email: emailB,
			password: 'correcthorse',
		})
		const tokenA = regA.body.token
		const tokenB = regB.body.token

		const meA = await request(app).get('/api/me').set('Authorization', `Bearer ${tokenA}`)
		const meB = await request(app).get('/api/me').set('Authorization', `Bearer ${tokenB}`)
		const idA = meA.body.id
		const idB = meB.body.id

		const created = await request(app)
			.post('/api/creations')
			.set('Authorization', `Bearer ${tokenA}`)
			.send({
				title: 'Published share',
				editorPayload: {
					kind: 'video',
					version: 3,
					sourceMediaId: '507f1f77bcf86cd799439011',
					workingMediaId: '507f1f77bcf86cd799439012',
					editState: {
						trim: { start: 0, end: 0 },
						presetFilter: 'default',
						textOverlays: [{ text: 'Hi', fontFamily: 'Arial', size: 32, color: '#FFFFFF', position: { x: 50, y: 50 } }],
					},
					textOverlaySettings: { text: 'Hi', fontFamily: 'Arial', size: 32, color: '#FFFFFF', position: { x: 50, y: 50 } },
					selectedFilterPreset: 'default',
				},
				status: 'draft',
			})
		expect(created.status).to.equal(201)
		const creationId = created.body._id

		const pub = await request(app)
			.post(`/api/creations/${creationId}/publish`)
			.set('Authorization', `Bearer ${tokenA}`)
		expect(pub.status).to.equal(200)

		const unpub = await request(app)
			.post(`/api/creations/${creationId}/unpublish`)
			.set('Authorization', `Bearer ${tokenA}`)
		expect(unpub.status).to.equal(200)
		expect(unpub.body.status).to.equal('exported')

		await request(app)
			.post(`/api/creations/${creationId}/publish`)
			.set('Authorization', `Bearer ${tokenA}`)

		const follow = await request(app)
			.post(`/api/users/${idA}/follow`)
			.set('Authorization', `Bearer ${tokenB}`)
			.send({})
		expect(follow.status).to.equal(200)

		const feed1 = await request(app).get('/api/me/feed').set('Authorization', `Bearer ${tokenB}`)
		expect(feed1.status).to.equal(200)
		const row = feed1.body.creations.find((c) => String(c._id) === String(creationId))
		expect(row).to.be.an('object')
		expect(row.isSaved).to.equal(false)

		const save = await request(app)
			.post(`/api/me/saved-feed-creations/${creationId}`)
			.set('Authorization', `Bearer ${tokenB}`)
			.send({})
		expect(save.status).to.equal(200)

		const feed2 = await request(app).get('/api/me/feed').set('Authorization', `Bearer ${tokenB}`)
		const row2 = feed2.body.creations.find((c) => String(c._id) === String(creationId))
		expect(row2.isSaved).to.equal(true)

		const unsave = await request(app)
			.delete(`/api/me/saved-feed-creations/${creationId}`)
			.set('Authorization', `Bearer ${tokenB}`)
		expect(unsave.status).to.equal(200)

		await Creation.deleteOne({ _id: creationId })
		await User.deleteOne({ email: emailA.trim().toLowerCase() })
		await User.deleteOne({ email: emailB.trim().toLowerCase() })
	})

	it('cannot save feed creation without following author', async () => {
		const emailA = uniqEmail()
		const emailB = uniqEmail()

		const regA = await request(app).post('/api/auth/register').send({
			email: emailA,
			password: 'correcthorse',
		})
		const regB = await request(app).post('/api/auth/register').send({
			email: emailB,
			password: 'correcthorse',
		})
		const tokenA = regA.body.token
		const tokenB = regB.body.token

		const created = await request(app)
			.post('/api/creations')
			.set('Authorization', `Bearer ${tokenA}`)
			.send({
				title: 'Lonely publish',
				editorPayload: { kind: 'image', version: 1 },
				status: 'draft',
			})
		const creationId = created.body._id
		await request(app)
			.post(`/api/creations/${creationId}/publish`)
			.set('Authorization', `Bearer ${tokenA}`)

		const save = await request(app)
			.post(`/api/me/saved-feed-creations/${creationId}`)
			.set('Authorization', `Bearer ${tokenB}`)
			.send({})
		expect(save.status).to.equal(403)

		await Creation.deleteOne({ _id: creationId })
		await User.deleteOne({ email: emailA.trim().toLowerCase() })
		await User.deleteOne({ email: emailB.trim().toLowerCase() })
	})

	it('guest lists creations by ownerKey', async () => {
		const ownerKey = `list-${Date.now()}`
		await request(app).post('/api/creations').send({
			ownerKey,
			title: 'Listed guest',
			editorPayload: { kind: 'image', version: 1 },
			status: 'draft',
		})

		const list = await request(app).get('/api/creations').query({ ownerKey })
		expect(list.status).to.equal(200)
		expect(list.body).to.be.an('array').with.length.at.least(1)

		await Creation.deleteMany({ ownerKey })
	})

	it('rejects creation without title', async () => {
		const res = await request(app).post('/api/creations').send({
			ownerKey: 'x',
			editorPayload: { kind: 'image', version: 1 },
			status: 'draft',
		})
		expect(res.status).to.equal(400)
	})

	it('guest can create draft and read it with ownerKey', async () => {
		const ownerKey = `guest-${Date.now()}`

		const created = await request(app).post('/api/creations').send({
			ownerKey,
			title: 'Guest draft',
			editorPayload: { kind: 'image', version: 1 },
			status: 'draft',
		})
		expect(created.status).to.equal(201)
		const id = created.body._id

		const got = await request(app).get(`/api/creations/${id}`).query({ ownerKey })
		expect(got.status).to.equal(200)
		expect(got.body.title).to.equal('Guest draft')

		await Creation.deleteOne({ _id: id })
	})

	it('updates and deletes owned creation', async () => {
		const email = uniqEmail()
		const reg = await request(app).post('/api/auth/register').send({
			email,
			password: 'correcthorse',
		})
		const token = reg.body.token

		const created = await request(app)
			.post('/api/creations')
			.set('Authorization', `Bearer ${token}`)
			.send({
				title: 'Patch me',
				editorPayload: { kind: 'image', version: 1 },
				status: 'draft',
			})
		const id = created.body._id

		const patched = await request(app)
			.patch(`/api/creations/${id}`)
			.set('Authorization', `Bearer ${token}`)
			.send({ title: 'Patched title' })
		expect(patched.status).to.equal(200)
		expect(patched.body.title).to.equal('Patched title')

		const del = await request(app).delete(`/api/creations/${id}`).set('Authorization', `Bearer ${token}`)
		expect(del.status).to.equal(200)

		await User.deleteOne({ email: email.trim().toLowerCase() })
	})

	it('search users and public profile + published creations', async () => {
		const email = uniqEmail()
		const email2 = uniqEmail()
		const reg = await request(app).post('/api/auth/register').send({
			email,
			password: 'correcthorse',
		})
		const token = reg.body.token
		const handle = `findme${Date.now().toString(36)}`

		const setUser = await request(app)
			.patch('/api/me')
			.set('Authorization', `Bearer ${token}`)
			.send({ username: handle, displayName: 'Searchable User' })
		expect(setUser.status).to.equal(200)

		const reg2 = await request(app).post('/api/auth/register').send({
			email: email2,
			password: 'correcthorse',
		})
		const token2 = reg2.body.token

		const search = await request(app)
			.get('/api/users/search')
			.set('Authorization', `Bearer ${token2}`)
			.query({ q: 'findme' })
		expect(search.status).to.equal(200)
		expect(search.body.users).to.be.an('array').with.length.at.least(1)

		const profile = await request(app).get(`/api/users/${handle}`)
		expect(profile.status).to.equal(200)
		expect(profile.body.username).to.equal(handle)

		const pubList = await request(app).get(`/api/users/${handle}/creations`)
		expect(pubList.status).to.equal(200)
		expect(pubList.body.creations).to.be.an('array')

		await User.deleteOne({ email: email.trim().toLowerCase() })
		await User.deleteOne({ email: email2.trim().toLowerCase() })
	})

	it('like published creation', async () => {
		const email = uniqEmail()
		const reg = await request(app).post('/api/auth/register').send({
			email,
			password: 'correcthorse',
		})
		const token = reg.body.token

		const created = await request(app)
			.post('/api/creations')
			.set('Authorization', `Bearer ${token}`)
			.send({
				title: 'Like me',
				editorPayload: { kind: 'image', version: 1 },
				status: 'draft',
			})
		const creationId = created.body._id
		await request(app).post(`/api/creations/${creationId}/publish`).set('Authorization', `Bearer ${token}`)

		const like = await request(app)
			.post(`/api/creations/${creationId}/like`)
			.set('Authorization', `Bearer ${token}`)
		expect(like.status).to.equal(200)
		expect(like.body.liked).to.equal(true)

		const unlike = await request(app)
			.post(`/api/creations/${creationId}/unlike`)
			.set('Authorization', `Bearer ${token}`)
		expect(unlike.status).to.equal(200)

		await Creation.deleteOne({ _id: creationId })
		await User.deleteOne({ email: email.trim().toLowerCase() })
	})
})
