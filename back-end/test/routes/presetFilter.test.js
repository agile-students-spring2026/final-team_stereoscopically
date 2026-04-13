import { expect } from 'chai'
import request from 'supertest'

import app from '../../server.js'
import { uploadTestImage } from '../helpers/imageTestUtils.js'

describe('Preset filter routes', () => {
    it('applies a preset filter to an image', async () => {
        const mediaId = await uploadTestImage(app)

        const res = await request(app).post('/api/filter/image').send({
            mediaId,
            preset: 'noir',
        })

        expect(res.status).to.equal(200)
        expect(res.body).to.include.keys('id', 'url', 'preset')
        expect(res.body.preset).to.equal('noir')
    })

    it('returns 400 for invalid preset values', async () => {
        const mediaId = await uploadTestImage(app)

        const res = await request(app).post('/api/filter/image').send({
            mediaId,
            preset: 'invalid-preset',
        })

        expect(res.status).to.equal(400)
        expect(res.body).to.have.property('code', 'INVALID_PRESET')
    })
})