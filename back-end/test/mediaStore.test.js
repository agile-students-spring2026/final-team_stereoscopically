import { expect } from 'chai'
import {
	createMedia,
	getMedia,
	deleteMedia,
	isMediaExpired,
	getActiveMediaOrDeleteExpired,
	purgeExpiredMedia,
} from '../src/services/mediaStore.js'
import { MEDIA_TTL_MS } from '../src/config/constants.js'

describe('mediaStore', () => {
	let originalNow

	beforeEach(() => {
		originalNow = Date.now
	})

	afterEach(() => {
		Date.now = originalNow
	})

	it('stores media with expiry and retrieves it', () => {
		Date.now = () => 10_000
		createMedia('fresh-1', { buffer: Buffer.from('a'), mimeType: 'image/png', size: 1 })

		const media = getMedia('fresh-1')
		expect(media).to.include({ mimeType: 'image/png', size: 1 })
		expect(media.expiresAt).to.equal(10_000 + MEDIA_TTL_MS)
	})

	it('deletes expired media when requested through active getter', () => {
		Date.now = () => 30_000
		createMedia('expire-1', { buffer: Buffer.from('c'), mimeType: 'image/png', size: 1 })

		Date.now = () => 30_000 + MEDIA_TTL_MS + 1
		const media = getActiveMediaOrDeleteExpired('expire-1')
		expect(media).to.equal(null)
		expect(getMedia('expire-1')).to.equal(undefined)
	})

	it('handles deleteMedia and isMediaExpired checks', () => {
		Date.now = () => 50_000
		createMedia('delete-1', { buffer: Buffer.from('x'), mimeType: 'image/png', size: 1 })
		deleteMedia('delete-1')
		expect(getMedia('delete-1')).to.equal(undefined)

		expect(isMediaExpired(null)).to.equal(true)
		expect(isMediaExpired({ expiresAt: 49_000 })).to.equal(true)
		expect(isMediaExpired({ expiresAt: 51_000 })).to.equal(false)
	})

	it('purges expired media entries', () => {
		Date.now = () => 60_000
		createMedia('expire-2', { buffer: Buffer.from('d'), mimeType: 'image/png', size: 1 })
		Date.now = () => 60_000 + MEDIA_TTL_MS + 1
		purgeExpiredMedia()
		expect(getMedia('expire-2')).to.equal(undefined)
	})
})
