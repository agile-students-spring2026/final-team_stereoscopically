import { expect } from 'chai'
import request from 'supertest'

import app from '../../server.js'

describe('GIF trim resize preset route', () => {
	it('returns 400 for unsupported resizePreset values', async () => {
		const res = await request(app)
			.post('/api/trim/video')
			.field('trimStart', '0')
			.field('trimEnd', '1')
			.field('resizePreset', 'cinematic')
			.attach('video', Buffer.from('fake-video-bytes'), {
				filename: 'clip.mp4',
				contentType: 'video/mp4',
			})

		expect(res.status).to.equal(400)
		expect(res.body).to.have.property('code', 'INVALID_RESIZE_PRESET')
	})

	it('returns 400 for unsupported resizeBorderColor values', async () => {
		const res = await request(app)
			.post('/api/trim/video')
			.field('trimStart', '0')
			.field('trimEnd', '1')
			.field('resizePreset', 'square')
			.field('resizeBorderColor', 'red')
			.attach('video', Buffer.from('fake-video-bytes'), {
				filename: 'clip.mp4',
				contentType: 'video/mp4',
			})

		expect(res.status).to.equal(400)
		expect(res.body).to.have.property('code', 'INVALID_RESIZE_BORDER_COLOR')
	})
})