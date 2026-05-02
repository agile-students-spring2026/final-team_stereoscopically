import cors from 'cors'
import 'dotenv/config'
import express from 'express'
import { fileURLToPath } from 'url'

import { PORT } from './src/config/constants.js'
import { connectToDatabase } from './src/config/database.js'
import { errorHandler, notFoundHandler } from './src/middleware/errorMiddleware.js'
import authRoutes from './src/routes/authRoutes.js'
import creationRoutes from './src/routes/creationRoutes.js'
import mediaRoutes from './src/routes/mediaRoutes.js'
import userRoutes from './src/routes/userRoutes.js'

const app = express()

app.use(cors())
app.use(express.json())
app.use(authRoutes)
app.use(userRoutes)
app.use(mediaRoutes)
app.use(creationRoutes)
app.use(notFoundHandler)
app.use(errorHandler)

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

