import mongoose from 'mongoose'

import { connectToDatabase } from '../src/config/database.js'

before(async function () {
	this.timeout(30_000)
	if (!process.env.MONGODB_URI) {
		return
	}
	await connectToDatabase()
})

after(async () => {
	if (mongoose.connection.readyState !== 0) {
		await mongoose.disconnect()
	}
})
