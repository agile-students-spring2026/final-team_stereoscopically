import { expect } from 'chai'
import {
	createMedia,
	getMediaFileInfo,
	openMediaDownloadStream,
	deleteMedia,
} from '../src/services/mediaStore.js'

describe('mediaStore', () => {
	it('rejects createMedia when required fields are missing', async () => {
		let err
		try {
			await createMedia({ mimeType: 'image/png' })
		} catch (error) {
			err = error
		}

		expect(err).to.be.instanceOf(Error)
		expect(err.message).to.include('Missing required media fields')
	})

	it('getMediaFileInfo returns null for invalid ids', async () => {
		const result = await getMediaFileInfo('not-an-objectid')
		expect(result).to.equal(null)
	})

	it('openMediaDownloadStream throws for invalid ids', () => {
		expect(() => openMediaDownloadStream('not-an-objectid')).to.throw('Invalid media id.')
	})

	it('deleteMedia is a no-op for invalid ids', async () => {
		await deleteMedia('not-an-objectid')
	})
})
