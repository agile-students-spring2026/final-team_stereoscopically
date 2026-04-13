import { expect } from 'chai'
import multer from 'multer'
import { notFoundHandler, errorHandler } from '../src/middleware/errorMiddleware.js'

const makeRes = () => {
	const response = {
		statusCode: null,
		payload: null,
		status(code) {
			this.statusCode = code
			return this
		},
		json(body) {
			this.payload = body
			return this
		},
	}
	return response
}

describe('error middleware', () => {
	it('returns 404 payload in notFoundHandler', () => {
		const res = makeRes()
		notFoundHandler({}, res)
		expect(res.statusCode).to.equal(404)
		expect(res.payload).to.deep.equal({
			error: 'Route not found.',
			code: 'ROUTE_NOT_FOUND',
		})
	})

	it('handles multer file-size errors with 400', () => {
		const res = makeRes()
		const err = new multer.MulterError('LIMIT_FILE_SIZE')
		errorHandler(err, {}, res, () => {})
		expect(res.statusCode).to.equal(400)
		expect(res.payload.code).to.equal('MAX_SIZE_EXCEEDED')
	})

	it('passes through when there is no error', () => {
		const res = makeRes()
		let nextCalled = false
		errorHandler(null, {}, res, () => {
			nextCalled = true
		})
		expect(nextCalled).to.equal(true)
	})
})
