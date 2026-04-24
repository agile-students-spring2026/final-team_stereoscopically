import mongoose from 'mongoose'
import { GridFSBucket } from 'mongodb'

const DEFAULT_DB_NAME = 'stereoscopically'

let mediaBucket = null

export const connectToDatabase = async () => {
	const uri = process.env.MONGODB_URI
	if (!uri) {
		throw new Error('Missing MONGODB_URI in environment variables.')
	}

	await mongoose.connect(uri, {
		dbName: process.env.MONGODB_DB_NAME || DEFAULT_DB_NAME,
	})

	mediaBucket = new GridFSBucket(mongoose.connection.db, {
		bucketName: 'media',
	})

	console.log('[backend] connected to MongoDB Atlas')
	return mongoose.connection
}

export const getMediaBucket = () => {
	if (!mediaBucket) {
		throw new Error('Media bucket is not initialized yet.')
	}
	return mediaBucket
}