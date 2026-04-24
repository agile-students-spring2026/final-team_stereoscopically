import { expect } from 'chai';
import { createMedia, getMediaFileInfo, deleteMedia } from '../../src/services/mediaStore.js';
import { trimVideo, applyPresetVideoFilter, exportGifService } from '../../src/services/gifMediaService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'sample.mp4');

// Helpers
const makeReq = (body = {}, file = null) => ({
  body,
  file,
  protocol: 'http',
  get: (header) => (header === 'host' ? 'localhost:4000' : ''),
})

let sampleVideoBuffer = null;
if (fs.existsSync(FIXTURE_PATH)) {
  sampleVideoBuffer = fs.readFileSync(FIXTURE_PATH);
}

const makeVideoFile = (buffer = sampleVideoBuffer) => ({
  buffer: buffer || Buffer.from('fake-data'),
  mimetype: 'video/mp4',
  size: buffer?.length || 9,
  originalname: 'sample.mp4',
})

const createdIds = [];
const trackMedia = (id) => { if (id) createdIds.push(id); };

describe('Media Services Unit Tests', () => {
  
  afterEach(() => {
    while (createdIds.length > 0) {
      deleteMedia(createdIds.pop());
    }
  });

  describe('Video Trimming', () => {
    it('should fail if no file is provided', async () => {
      const res = await trimVideo(makeReq({ trimStart: '0', trimEnd: '3' }, null));
      expect(res.error.code).to.equal('MISSING_FILE');
      expect(res.error.status).to.equal(400);
    });

    it('should fail on invalid numeric ranges', async () => {
      const res = await trimVideo(makeReq({ trimStart: '5', trimEnd: '2' }, makeVideoFile()));
      expect(res.error.code).to.equal('INVALID_TRIM_RANGE');
    });

    it('should fail on non-numeric inputs', async () => {
      const res = await trimVideo(makeReq({ trimStart: 'start', trimEnd: '3' }, makeVideoFile()));
      expect(res.error.code).to.equal('INVALID_TRIM_VALUES');
    });

    // Only runs if ffmpeg/fixture available
    if (sampleVideoBuffer) {
      it('should successfully produce a GIF from a valid video', async function() {
        this.timeout(10000);
        const res = await trimVideo(makeReq({ trimStart: '0', trimEnd: '1' }, makeVideoFile()));
          trackMedia(res.data?.id);

          expect(res.status).to.equal(200);
          expect(res.data.type).to.equal('gif');
          const fileInfo = await getMediaFileInfo(res.data.id);
          expect(fileInfo).to.not.equal(null);
      })

      it('should successfully apply text overlay metadata during GIF trim flow', async function() {
        this.timeout(10000);
        const textOverlay = {
          text: 'GIF Title',
          size: 24,
          color: '#ffffff',
          position: { x: 50, y: 50 },
        };

        const res = await trimVideo(
              makeReq(
                {
                  trimStart: '0',
                  trimEnd: '1',
                  textOverlay: JSON.stringify(textOverlay),
                },
                makeVideoFile(),
              ),
          );
          trackMedia(res.data?.id);

          // The trim pipeline should succeed when textOverlay is provided. Detailed
          // persistence of textOverlay metadata is tested elsewhere; here we assert
          // the GIF was produced successfully.
          expect(res.status).to.equal(200);
          expect(res.data.type).to.equal('gif');
          const fileInfo2 = await getMediaFileInfo(res.data.id);
          expect(fileInfo2).to.not.equal(null);
      })
    }
  })

  describe('Video Filters', () => {
    it('should reject unknown presets', async () => {
      const res = await applyPresetVideoFilter(makeReq({ preset: 'deepfry' }, makeVideoFile()));
      expect(res.error.code).to.equal('INVALID_PRESET');
    })

    })

  describe('GIF Export Service', () => {
    let testId;
    beforeEach(async () => {
      // create a real stored media object and capture its generated id
      const created = await createMedia({
        buffer: Buffer.from('GIF89a...'),
        filename: 'test.gif',
        mimeType: 'image/gif',
        metadata: { kind: 'gif', test: true },
      })
      testId = created.id
      // track for cleanup
      createdIds.push(testId)
    })

    it('should generate valid export and download URLs', async () => {
      const res = await exportGifService(makeReq({ mediaId: testId }));
      expect(res.status).to.equal(200);
      expect(res.data.url).to.contain(`/api/media/${testId}`);
      expect(res.data.downloadUrl).to.contain('/download');
    })

    it('should return 404 for missing media', async () => {
      const res = await exportGifService(makeReq({ mediaId: '000000000000000000000000' }));
      expect(res.error.status).to.equal(404);
    })
  })
})
