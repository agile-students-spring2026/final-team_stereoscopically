import { expect } from 'chai'
import request from 'supertest'

import app from '../../server.js'
import { uploadTestImage } from '../helpers/imageTestUtils.js'

describe('Color adjustment routes', () => {
    it('applies color adjustments successfully', async () => {
        const mediaId = await uploadTestImage(app)

        const res = await request(app).post('/api/adjust/image').send({
            mediaId,
            brightness: 1.1,
            contrast: 1.2,
            saturation: 1.05,
            hue: 0,
            grayscale: 0,
            sepia: 0,
            sharpness: 1,
        })

        expect(res.status).to.equal(200)
        expect(res.body).to.include.keys('id', 'url', 'mimeType')
        expect(res.body.mimeType).to.equal('image/png')
    })

    it('returns 400 for invalid adjustment payload', async () => {
        const mediaId = await uploadTestImage(app)

        const res = await request(app).post('/api/adjust/image').send({
            mediaId,
            brightness: 'bad-number',
        })

        expect(res.status).to.equal(400)
        expect(res.body).to.have.property('code', 'INVALID_ADJUST_PARAMS')
    })
})