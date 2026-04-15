import { expect } from 'chai'

import { addTextToImage, uploadImage } from '../src/services/mediaService.js'

const uploadFakeImage = () => {
	const req = {
		protocol: 'http',
		get: () => 'localhost:4000',
		file: {
			buffer: Buffer.from('fake-image-bytes'),
			mimetype: 'image/png',
			size: 16,
		},
	}
	const result = uploadImage(req)
	return result.data.id
}

const fakeReq = (body) => ({
	protocol: 'http',
	get: () => 'localhost:4000',
	body: body,
})

describe('mediaService addTextToImage', () => {
	it('returns error when mediaId is missing', async () => {
		const result = await addTextToImage(fakeReq({ text: 'hello', x: 0.5, y: 0.5 }))
		expect(result.error).to.include({ status: 400, code: 'MISSING_MEDIA_ID' })
	})

	it('returns error when media is not found', async () => {
		const result = await addTextToImage(fakeReq({ mediaId: 'nonexistent', text: 'hello', x: 0.5, y: 0.5 }))
		expect(result.error).to.include({ status: 404, code: 'MEDIA_NOT_FOUND' })
	})

	it('returns error when text payload is invalid', async () => {
		const mediaId = uploadFakeImage()
		const result = await addTextToImage(fakeReq({ mediaId, text: 123, x: 0.5, y: 0.5 }))
		expect(result.error).to.include({ status: 400, code: 'INVALID_TEXT_PAYLOAD' })
	})

	it('returns noOp when text is empty', async () => {
		const mediaId = uploadFakeImage()
		const result = await addTextToImage(fakeReq({ mediaId, text: '', x: 0.5, y: 0.5 }))
		expect(result.status).to.equal(200)
		expect(result.data.noOp).to.equal(true)
	})
})