import { expect } from 'chai'
import request from 'supertest'

import app from '../../server.js'
import { uploadTestImage } from '../helpers/imageTestUtils.js'

describe('Image reframe (crop) routes', () => {
    it('crops an uploaded image successfully', async () => {
        const mediaId = await uploadTestImage(app)

        const res = await request(app).post('/api/crop/image').send({
            mediaId,
            x: 0,
            y: 0,
            width: 1,
            height: 1,
            unit: 'ratio',
        })

        expect(res.status).to.equal(200)
        expect(res.body).to.include.keys('id', 'url', 'width', 'height')
    })

    it('returns 400 when mediaId is missing', async () => {
        const res = await request(app).post('/api/crop/image').send({
            x: 0,
            y: 0,
            width: 10,
            height: 10,
            unit: 'pixel',
        })

        expect(res.status).to.equal(400)
        expect(res.body).to.have.property('code', 'MISSING_MEDIA_ID')
    })
})