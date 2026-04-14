import sharp from 'sharp'
import { expect } from 'chai'
import request from 'supertest'

let cachedPngBuffer = null

const getTestPngBuffer = async () => {
	if (!cachedPngBuffer) {
		cachedPngBuffer = await sharp({
			create: {
				width: 4,
				height: 4,
				channels: 4,
				background: { r: 255, g: 0, b: 0, alpha: 1 },
			},
		})
			.png()
			.toBuffer()
	}

	return cachedPngBuffer
}

export const uploadTestImage = async (app) => {
	const pngBuffer = await getTestPngBuffer()
	const res = await request(app)
		.post('/api/upload/image')
		.attach('file', pngBuffer, { filename: 'test.png', contentType: 'image/png' })

	expect(res.status).to.equal(200)
	expect(res.body).to.have.property('id')
	return res.body.id
}
