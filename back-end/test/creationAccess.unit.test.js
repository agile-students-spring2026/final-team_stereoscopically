import { expect } from 'chai'
import mongoose from 'mongoose'

import { guestCanAccessCreation, userOwnsCreation } from '../src/controllers/creationAccess.js'

describe('creationAccess (unit)', () => {
	it('guestCanAccessCreation matches ownerKey on guest draft', () => {
		const creation = { ownerKey: 'abc', userId: null }
		expect(guestCanAccessCreation(creation, 'abc')).to.equal(true)
		expect(guestCanAccessCreation(creation, 'wrong')).to.equal(false)
	})

	it('guestCanAccessCreation rejects when creation has userId', () => {
		const creation = { ownerKey: 'abc', userId: new mongoose.Types.ObjectId() }
		expect(guestCanAccessCreation(creation, 'abc')).to.equal(false)
	})

	it('guestCanAccessCreation rejects empty ownerKey', () => {
		expect(guestCanAccessCreation({ ownerKey: 'x' }, '')).to.equal(false)
	})

	it('userOwnsCreation matches same user', () => {
		const uid = new mongoose.Types.ObjectId()
		const userDoc = { _id: uid }
		const creation = { userId: uid }
		expect(userOwnsCreation(creation, userDoc)).to.equal(true)
	})

	it('userOwnsCreation rejects different user', () => {
		const uid = new mongoose.Types.ObjectId()
		const other = new mongoose.Types.ObjectId()
		const userDoc = { _id: uid }
		const creation = { userId: other }
		expect(userOwnsCreation(creation, userDoc)).to.equal(false)
	})

	it('userOwnsCreation rejects guest creation', () => {
		const userDoc = { _id: new mongoose.Types.ObjectId() }
		expect(userOwnsCreation({ userId: null }, userDoc)).to.equal(false)
	})
})
