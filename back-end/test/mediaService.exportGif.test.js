import { expect } from 'chai'

import { exportGifService } from '../src/services/mediaService.js'
import { createMedia } from '../src/services/mediaStore.js'

describe('mediaService exportGifService', () => {
	it('returns error when gif export mediaId is missing', () => {
		const result = exportGifService({ body: {} })
		expect(result.error).to.include({
			status: 400,
			code: 'MISSING_MEDIA_ID',
		})
	})

	it('returns not found when gif export media is missing/expired', () => {
		const req = {
			body: { mediaId: 'missing-gif' },
		}
		const result = exportGifService(req)
		expect(result.error).to.include({
			status: 404,
			code: 'MEDIA_NOT_FOUND',
		})
	})

	it('returns export metadata for existing gif media', () => {
		const mediaId = `gif_test_${Date.now()}`
		createMedia(mediaId, {
			buffer: Buffer.from('gif-bytes'),
			mimeType: 'image/gif',
			size: 9,
			fileName: 'sample.gif',
		})

		const req = {
			protocol: 'http',
			get: () => 'localhost:4000',
			body: { mediaId },
		}

		const result = exportGifService(req)
		expect(result.status).to.equal(200)
		expect(result.data.id).to.equal(mediaId)
		expect(result.data.url).to.include(`/api/media/${mediaId}`)
		expect(result.data.downloadUrl).to.include(`/api/export/${mediaId}/download`)
	})
})