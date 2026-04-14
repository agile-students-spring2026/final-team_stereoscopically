import { expect } from 'chai'
import { addTextToImage, exportImage, uploadImage } from '../src/services/mediaService.js'

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
	body,
})


describe('addTextToImage', () => {
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


describe('exportImage', () => {
	it('returns error when mediaId is missing', async () => {
		const result = await exportImage(fakeReq({ width: 512, height: 512 }))
		expect(result.error).to.include({ status: 400, code: 'MISSING_MEDIA_ID' })
	})

	it('returns error when media is not found', async () => {
		const result = await exportImage(fakeReq({ mediaId: 'nonexistent', width: 512, height: 512 }))
		expect(result.error).to.include({ status: 404, code: 'MEDIA_NOT_FOUND' })
	})

	it('returns error when dimensions are invalid', async () => {
		const mediaId = uploadFakeImage()
		const result = await exportImage(fakeReq({ mediaId, width: -1, height: 512 }))
		expect(result.error).to.include({ status: 400, code: 'INVALID_DIMENSIONS' })
	})

	it('returns error when letterbox color is invalid', async () => {
		const mediaId = uploadFakeImage()
		const result = await exportImage(fakeReq({ mediaId, width: 512, height: 512, letterboxColor: 'notacolor' }))
		expect(result.error).to.include({ status: 400, code: 'INVALID_LETTERBOX_COLOR' })
	})
})
