import cors from 'cors'
import 'dotenv/config'
import express from 'express'
import { fileURLToPath } from 'url'

import { MEDIA_PURGE_INTERVAL_MS, PORT } from './src/config/constants.js'
import { connectToDatabase } from './src/config/database.js'
import { errorHandler, notFoundHandler } from './src/middleware/errorMiddleware.js'
import mediaRoutes from './src/routes/mediaRoutes.js'
import { purgeExpiredMedia } from './src/services/mediaStore.js'

const app = express()

app.use(cors())
app.use(express.json())
app.use(mediaRoutes)
app.use(notFoundHandler)
app.use(errorHandler)

if (process.env.NODE_ENV !== 'test') {
	setInterval(purgeExpiredMedia, MEDIA_PURGE_INTERVAL_MS).unref()
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url)
if (isDirectRun) {
	connectToDatabase()
		.then(() => {
			app.listen(PORT, () => {
				console.log(`[backend] server running on http://localhost:${PORT}`)
			})
		})
		.catch((error) => {
			console.error('[backend] failed to connect to MongoDB', error)
			process.exit(1)
		})
}

export default app

