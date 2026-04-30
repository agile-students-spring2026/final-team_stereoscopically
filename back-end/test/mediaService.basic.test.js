import { expect } from 'chai'
import { getMediaContent } from '../src/services/mediaReadService.js'
import { trimVideo } from '../src/services/gifMediaService.js'
import { uploadImage } from '../src/services/imageMediaService.js'

describe('mediaService basic flows', () => {
	it('returns error when image file is missing', async () => {
		const result = await uploadImage({ file: null })
		expect(result.error).to.include({
			status: 400,
			code: 'MISSING_FILE',
		})
	})

	it('uploads a valid image and can fetch content by id', async () => {
		const req = {
			protocol: 'http',
			get: () => 'localhost:4000',
			file: {
				buffer: Buffer.from('fake-image-bytes'),
				mimetype: 'image/png',
				size: 16,
			},
		}

		const upload = await uploadImage(req)
		expect(upload.status).to.equal(200)
		expect(upload.data.id).to.be.a('string')
		expect(upload.data.mimeType).to.equal('image/png')

		const fetched = await getMediaContent(upload.data.id)
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

	it('accepts transparent resizeBorderColor without INVALID_RESIZE_BORDER_COLOR', async () => {
		const result = await trimVideo({
			body: {
				trimStart: 0,
				trimEnd: 1,
				resizePreset: 'square',
				resizeBorderColor: 'transparent',
			},
			file: {
				buffer: Buffer.from('fake-video-bytes'),
				mimetype: 'video/mp4',
				size: 16,
			},
		})

		expect(result.error?.code).to.not.equal('INVALID_RESIZE_BORDER_COLOR')
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

	it('returns INVALID_TEXT_OVERLAY for malformed text overlay payload', async () => {
		const result = await trimVideo({
			body: {
				trimStart: 0,
				trimEnd: 1,
				textOverlay: '{bad-json',
			},
			file: {
				buffer: Buffer.from('fake-video-bytes'),
				mimetype: 'video/mp4',
				size: 16,
			},
		})

		expect(result.error).to.include({
			status: 400,
			code: 'INVALID_TEXT_OVERLAY',
		})
	})

	it('returns INVALID_TEXT_OVERLAY_POSITION when text overlay position is out of range', async () => {
		const result = await trimVideo({
			body: {
				trimStart: 0,
				trimEnd: 1,
				textOverlay: JSON.stringify({
					text: 'hello',
					size: 24,
					color: '#ffffff',
					position: { x: 140, y: 40 },
				}),
			},
			file: {
				buffer: Buffer.from('fake-video-bytes'),
				mimetype: 'video/mp4',
				size: 16,
			},
		})

		expect(result.error).to.include({
			status: 400,
			code: 'INVALID_TEXT_OVERLAY_POSITION',
		})
	})

	it('returns INVALID_TEXT_OVERLAY_SIZE when text overlay size is out of range', async () => {
		const result = await trimVideo({
			body: {
				trimStart: 0,
				trimEnd: 1,
				textOverlay: JSON.stringify({
					text: 'hello',
					size: 999,
					color: '#ffffff',
					position: { x: 50, y: 50 },
				}),
			},
			file: {
				buffer: Buffer.from('fake-video-bytes'),
				mimetype: 'video/mp4',
				size: 16,
			},
		})

		expect(result.error).to.include({
			status: 400,
			code: 'INVALID_TEXT_OVERLAY_SIZE',
		})
	})

	it('returns INVALID_TEXT_OVERLAY_COLOR when text overlay color is invalid', async () => {
		const result = await trimVideo({
			body: {
				trimStart: 0,
				trimEnd: 1,
				textOverlay: JSON.stringify({
					text: 'hello',
					size: 24,
					color: 'blue',
					position: { x: 50, y: 50 },
				}),
			},
			file: {
				buffer: Buffer.from('fake-video-bytes'),
				mimetype: 'video/mp4',
				size: 16,
			},
		})

		expect(result.error).to.include({
			status: 400,
			code: 'INVALID_TEXT_OVERLAY_COLOR',
		})
	})

	it('returns INVALID_TEXT_OVERLAY_TEXT when text overlay text is not a string', async () => {
		const result = await trimVideo({
			body: {
				trimStart: 0,
				trimEnd: 1,
				textOverlay: JSON.stringify({
					text: 123,
					size: 24,
					color: '#ffffff',
					position: { x: 50, y: 50 },
				}),
			},
			file: {
				buffer: Buffer.from('fake-video-bytes'),
				mimetype: 'video/mp4',
				size: 16,
			},
		})

		expect(result.error).to.include({
			status: 400,
			code: 'INVALID_TEXT_OVERLAY_TEXT',
		})
	})
})
