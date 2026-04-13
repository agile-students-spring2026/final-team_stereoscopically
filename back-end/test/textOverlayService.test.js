import { expect } from 'chai'
import { normalizeTextOverlayRequest } from '../src/services/textOverlayService.js'

describe('normalizeTextOverlayRequest', () => {
	it('normalizes valid payload with defaults', () => {
		const result = normalizeTextOverlayRequest({
			text: 'hello',
			x: 0.3,
			y: 0.7,
		})

		expect(result.error).to.equal(undefined)
		expect(result.value).to.deep.equal({
			text: 'hello',
			x: 0.3,
			y: 0.7,
			fontFamily: 'Arial',
			fontSize: 36,
			color: '#FFFFFF',
		})
	})

	it('rejects non-string text payload', () => {
		const result = normalizeTextOverlayRequest({
			text: 123,
			x: 0.5,
			y: 0.5,
		})

		expect(result.error).to.include({
			status: 400,
			code: 'INVALID_TEXT_PAYLOAD',
		})
	})

	it('rejects invalid positions', () => {
		const result = normalizeTextOverlayRequest({
			text: 'hello',
			x: -0.1,
			y: 2,
		})

		expect(result.error).to.include({
			status: 400,
			code: 'INVALID_POSITION',
		})
	})

	it('rejects invalid font size', () => {
		const result = normalizeTextOverlayRequest({
			text: 'hello',
			x: 0.5,
			y: 0.5,
			fontSize: 5000,
		})

		expect(result.error).to.include({
			status: 400,
			code: 'INVALID_FONT_SIZE',
		})
	})
})
