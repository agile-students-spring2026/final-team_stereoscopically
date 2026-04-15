import { expect } from 'chai'
import { getMediaContent, trimVideo, uploadImage } from '../src/services/mediaService.js'

describe('mediaService basic flows', () => {
	it('returns error when image file is missing', () => {
		const result = uploadImage({ file: null })
		expect(result.error).to.include({
			status: 400,
			code: 'MISSING_FILE',
		})
	})

	it('uploads a valid image and can fetch content by id', () => {
		const req = {
			protocol: 'http',
			get: () => 'localhost:4000',
			file: {
				buffer: Buffer.from('fake-image-bytes'),
				mimetype: 'image/png',
				size: 16,
			},
		}

		const upload = uploadImage(req)
		expect(upload.status).to.equal(200)
		expect(upload.data.id).to.be.a('string')
		expect(upload.data.mimeType).to.equal('image/png')

		const fetched = getMediaContent(upload.data.id)
		expect(fetched.status).to.equal(200)
		expect(fetched.headers['Content-Type']).to.equal('image/png')
		expect(Buffer.isBuffer(fetched.data)).to.equal(true)
	})

	it('returns INVALID_RESIZE_PRESET for unsupported GIF resize preset', async () => {
		const result = await trimVideo({
			body: {
				trimStart: 0,
				trimEnd: 1,
				resizePreset: 'cinematic',
			},
			file: {
				buffer: Buffer.from('fake-video-bytes'),
				mimetype: 'video/mp4',
				size: 16,
			},
		})

		expect(result.error).to.include({
			status: 400,
			code: 'INVALID_RESIZE_PRESET',
		})
	})

	it('returns INVALID_RESIZE_BORDER_COLOR for unsupported border color values', async () => {
		const result = await trimVideo({
			body: {
				trimStart: 0,
				trimEnd: 1,
				resizePreset: 'square',
				resizeBorderColor: 'red',
			},
			file: {
				buffer: Buffer.from('fake-video-bytes'),
				mimetype: 'video/mp4',
				size: 16,
			},
		})

		expect(result.error).to.include({
			status: 400,
			code: 'INVALID_RESIZE_BORDER_COLOR',
		})
	})

	it('uses trim validation path when resize preset is omitted', async () => {
		const result = await trimVideo({
			body: {
				trimStart: 2,
				trimEnd: 1,
			},
			file: {
				buffer: Buffer.from('fake-video-bytes'),
				mimetype: 'video/mp4',
				size: 16,
			},
		})

		expect(result.error).to.include({
			status: 400,
			code: 'INVALID_TRIM_RANGE',
		})
	})
})
