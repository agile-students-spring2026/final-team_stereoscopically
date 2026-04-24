import { expect } from 'chai'

import { exportGifService } from '../src/services/gifMediaService.js'

describe('mediaService exportGifService', () => {
	it('returns error when gif export mediaId is missing', async () => {
		const result = await exportGifService({ body: {} })
		expect(result.error).to.include({
			status: 400,
			code: 'MISSING_MEDIA_ID',
		})
	})

	it('returns not found when gif export media is missing/expired', async () => {
		const req = {
			body: { mediaId: 'missing-gif' },
		}
		const result = await exportGifService(req)
		expect(result.error).to.include({
			status: 404,
			code: 'MEDIA_NOT_FOUND',
		})
	})
})