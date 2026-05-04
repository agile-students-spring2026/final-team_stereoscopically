import { expect } from 'chai'

import { exportGifService } from '../src/services/gifMediaService.js'
import { createMedia, deleteMedia } from '../src/services/mediaStore.js'

/** Minimal valid 1×1 GIF for ffmpeg palette tests */
const MIN_GIF = Buffer.from(
	'47494638396101000100800000ffffff00000021f90401000000002c00000000010001000002024401003b',
	'hex',
)

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

	it('returns same media id when playbackRate is 1', async () => {
		const { id } = await createMedia({
			buffer: MIN_GIF,
			filename: 'tiny.gif',
			mimeType: 'image/gif',
			metadata: { test: true },
		})
		try {
			const result = await exportGifService({ body: { mediaId: id, playbackRate: 1 } })
			expect(result.status).to.equal(200)
			expect(result.data.id).to.equal(id)
		} finally {
			await deleteMedia(id).catch(() => {})
		}
	})

	it('produces a new gif id when playbackRate is not 1', async function () {
		this.timeout(20000)
		const { id } = await createMedia({
			buffer: MIN_GIF,
			filename: 'tiny.gif',
			mimeType: 'image/gif',
			metadata: { test: true },
		})
		let outId = null
		try {
			const result = await exportGifService({ body: { mediaId: id, playbackRate: 2 } })
			expect(result.status).to.equal(200)
			outId = result.data.id
			expect(outId).to.be.a('string')
			expect(outId).to.not.equal(id)
		} finally {
			await deleteMedia(id).catch(() => {})
			if (outId) await deleteMedia(outId).catch(() => {})
		}
	})
})