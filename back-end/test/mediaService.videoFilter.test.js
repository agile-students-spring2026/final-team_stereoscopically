import { expect } from 'chai'

import { applyPresetVideoFilter } from '../src/services/mediaService.js'

describe('mediaService applyPresetVideoFilter validation', () => {
	it('returns error when video filter file is missing', async () => {
		const result = await applyPresetVideoFilter({ body: { preset: 'sepia' } })
		expect(result.error).to.include({
			status: 400,
			code: 'MISSING_FILE',
		})
	})

	it('returns error when video filter preset is invalid', async () => {
		const result = await applyPresetVideoFilter({
			body: { preset: 'unknown-preset' },
			file: {
				buffer: Buffer.from('video-bytes'),
				mimetype: 'video/mp4',
				size: 11,
			},
		})

		expect(result.error).to.include({
			status: 400,
			code: 'INVALID_PRESET',
		})
	})
})