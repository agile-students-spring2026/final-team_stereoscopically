import mongoose from 'mongoose'

const DEFAULT_DB_NAME = 'stereoscopically'

export const connectToDatabase = async () => {
	const uri = process.env.MONGODB_URI
	if (!uri) {
		throw new Error('Missing MONGODB_URI in environment variables.')
	}

	await mongoose.connect(uri, {
		dbName: process.env.MONGODB_DB_NAME || DEFAULT_DB_NAME,
	})

	console.log('[backend] connected to MongoDB Atlas')
	return mongoose.connection
}

