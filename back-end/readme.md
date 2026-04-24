# Backend API

## Overview

This backend provides image-processing endpoints for the StickerCreate app. It is built with Express, uses MongoDB Atlas for persistence, and stores uploaded/generated media in GridFS.

## Stack

- Node.js
- Express
- Multer (multipart upload handling)
- Sharp (image processing)
- Fluent-ffmpeg + @ffmpeg-installer/ffmpeg (video trim/filter processing)

## Setup

```bash
npm install
cp .env.example .env
```

Configure `.env` with your MongoDB Atlas credentials before running the server.

## Scripts

- `npm run dev` - start the API server
- `npm run start` - start the API server
- `npm test` - run backend tests (Mocha)
- `npm run coverage` - run tests with coverage (c8)

Default server URL: `http://localhost:4000`

## API endpoints

### Health check

- **Method:** `GET`
- **Path:** `/health`

**Success response**

```json
{
  "status": "ok",
  "database": "connected"
}
```

### Upload image

- **Method:** `POST`
- **Path:** `/api/upload/image`
- **Content-Type:** `multipart/form-data`
- **Field:** `file` (required)

**Success response (200)**

```json
{
  "id": "img_...",
  "type": "image",
  "url": "http://localhost:4000/api/media/<id>",
  "mimeType": "image/png",
  "size": 12345
}
```

**Validation/error responses**

- `400 { "error": "No image file uploaded.", "code": "MISSING_FILE" }`
- `400 { "error": "Unsupported file type. Please upload an image.", "code": "INVALID_TYPE" }`
- `400 { "error": "File is too large (max 50 MB).", "code": "MAX_SIZE_EXCEEDED" }`

### Crop image

- **Method:** `POST`
- **Path:** `/api/crop/image`
- **Content-Type:** `application/json`

**Request body**

```json
{
  "mediaId": "img_...",
  "x": 10,
  "y": 20,
  "width": 200,
  "height": 150,
  "unit": "pixel",
  "scaleX": 1,
  "scaleY": 1
}
```

`unit` accepts `pixel` or `ratio`.

**Success response (200)**

```json
{
  "id": "img_...",
  "type": "image",
  "url": "http://localhost:4000/api/media/<id>",
  "mimeType": "image/png",
  "size": 12345,
  "width": 200,
  "height": 150
}
```

**Validation/error responses**

- `400 { "error": "Missing mediaId.", "code": "MISSING_MEDIA_ID" }`
- `400 { "error": "Invalid crop bounds.", "code": "INVALID_CROP_BOUNDS" }`
- `400 { "error": "Crop width and height must be greater than 0.", "code": "INVALID_CROP_SIZE" }`
- `400 { "error": "Invalid crop unit.", "code": "INVALID_CROP_UNIT" }`
- `400 { "error": "Invalid crop scale.", "code": "INVALID_CROP_SCALE" }`
- `400 { "error": "Ratio crop values must be between 0 and 1.", "code": "INVALID_CROP_RATIO" }`
- `404 { "error": "Media not found or expired.", "code": "MEDIA_NOT_FOUND" }`
- `500 { "error": "Failed to process image crop.", "code": "CROP_FAILED" }`

### Adjust image

- **Method:** `POST`
- **Path:** `/api/adjust/image`
- **Content-Type:** `application/json`

**Request body**

```json
{
  "mediaId": "img_...",
  "brightness": 1,
  "contrast": 1,
  "saturation": 1,
  "hue": 0,
  "grayscale": 0,
  "sepia": 0,
  "sharpness": 1
}
```

**Validation/error responses**

- `400 { "error": "Missing mediaId.", "code": "MISSING_MEDIA_ID" }`
- `400 { "error": "Adjustment values must be finite numbers.", "code": "INVALID_ADJUST_PARAMS" }`
- `400 { "error": "Only static images are supported (not GIF).", "code": "UNSUPPORTED_MEDIA_TYPE" }`
- `404 { "error": "Media not found or expired.", "code": "MEDIA_NOT_FOUND" }`
- `500 { "error": "Failed to adjust image.", "code": "ADJUST_FAILED" }`

### Apply preset image filter

- **Method:** `POST`
- **Path:** `/api/filter/image`
- **Content-Type:** `application/json`

**Request body**

```json
{
  "mediaId": "img_...",
  "preset": "sepia"
}
```

Supported presets: `noir`, `sepia`, `vivid`, `fade`.

**Validation/error responses**

- `400 { "error": "Missing mediaId.", "code": "MISSING_MEDIA_ID" }`
- `400 { "error": "Invalid or unsupported preset.", "code": "INVALID_PRESET" }`
- `400 { "error": "Only static images are supported (not GIF).", "code": "UNSUPPORTED_MEDIA_TYPE" }`
- `404 { "error": "Media not found or expired.", "code": "MEDIA_NOT_FOUND" }`
- `500 { "error": "Failed to apply preset filter.", "code": "PRESET_FILTER_FAILED" }`

### Export image

- **Method:** `POST`
- **Path:** `/api/export/image`
- **Content-Type:** `application/json`

**Request body**

```json
{
  "mediaId": "img_...",
  "width": 512,
  "height": 512,
  "letterboxColor": "#FFFFFF"
}
```

`letterboxColor` accepts `transparent` or `#RRGGBB`.

**Success response (200)**

```json
{
  "id": "exp_...",
  "type": "image",
  "url": "http://localhost:4000/api/media/<id>",
  "downloadUrl": "http://localhost:4000/api/export/<id>/download",
  "mimeType": "image/png",
  "width": 512,
  "height": 512,
  "size": 12345,
  "fileName": "sticker-512x512.png"
}
```

**Validation/error responses**

- `400 { "error": "Missing mediaId for export.", "code": "MISSING_MEDIA_ID" }`
- `400 { "error": "Invalid export dimensions.", "code": "INVALID_DIMENSIONS" }`
- `400 { "error": "Invalid letterbox color. Use \"transparent\" or a #RRGGBB hex value.", "code": "INVALID_LETTERBOX_COLOR" }`
- `400 { "error": "Only static image export is supported.", "code": "UNSUPPORTED_MEDIA_TYPE" }`
- `404 { "error": "Media not found or expired.", "code": "MEDIA_NOT_FOUND" }`
- `500 { "error": "Failed to export image.", "code": "EXPORT_FAILED" }`

### Add text to image

- **Method:** `POST`
- **Path:** `/api/text/image`
- **Content-Type:** `application/json`

**Request body**

```json
{
  "mediaId": "img_...",
  "text": "Hello\nWorld",
  "x": 0.5,
  "y": 0.5,
  "fontFamily": "Arial",
  "fontSize": 960,
  "color": "#111111"
}
```

Notes:
- `x` and `y` are center-anchor ratio coordinates in the range `0..1`.
- `text` supports multiline values using `\n` line breaks.
- Supported font families are `Arial`, `Helvetica`, and `Georgia`.
- Unsupported `fontFamily` values fall back to `Arial`.
- `fontSize` must be between `8` and `2000`.
- If `text` is empty or whitespace-only, the endpoint returns a successful no-op response with the same media ID.

**Success response (200)**

```json
{
  "id": "img_...",
  "type": "image",
  "url": "http://localhost:4000/api/media/<id>",
  "mimeType": "image/png",
  "size": 12345,
  "width": 512,
  "height": 512,
  "noOp": false
}
```

**Validation/error responses**

- `400 { "error": "Missing mediaId.", "code": "MISSING_MEDIA_ID" }`
- `400 { "error": "Invalid text payload.", "code": "INVALID_TEXT_PAYLOAD" }`
- `400 { "error": "Text is too long. Maximum allowed length is 300 characters.", "code": "INVALID_TEXT_PAYLOAD" }`
- `400 { "error": "Invalid text position.", "code": "INVALID_POSITION" }`
- `400 { "error": "Invalid font size. Must be between 8 and 2000.", "code": "INVALID_FONT_SIZE" }`
- `400 { "error": "Only image text overlay is supported.", "code": "UNSUPPORTED_MEDIA_TYPE" }`
- `404 { "error": "Media not found or expired.", "code": "MEDIA_NOT_FOUND" }`
- `500 { "error": "Failed to render text overlay.", "code": "TEXT_RENDER_FAILED" }`

### Fetch media by ID

- **Method:** `GET`
- **Path:** `/api/media/:id`

**Success response**

- Binary media content with `Content-Type` matching stored MIME type.

**Error response**

- `404 { "error": "Media not found or expired.", "code": "MEDIA_NOT_FOUND" }`

### Download exported media by ID

- **Method:** `GET`
- **Path:** `/api/export/:id/download`

**Success response**

- Binary media content with `Content-Disposition: attachment`.

**Error response**

- `404 { "error": "Media not found or expired.", "code": "MEDIA_NOT_FOUND" }`

### Trim video

- **Method:** `POST`
- **Path:** `/api/trim/video`
- **Content-Type:** `multipart/form-data`
- **Field:** `video` (required)

**Form fields**

- `trimStart` (seconds)
- `trimEnd` (seconds)
- `resizePreset` (optional: `square`, `landscape`, `portrait`)
- `resizeBorderColor` (optional: `#RRGGBB`)
- `textOverlay` (optional JSON string payload)

`textOverlay` JSON shape:

```json
{
  "text": "GIF Title",
  "size": 24,
  "color": "#FFFFFF",
  "position": { "x": 50, "y": 50 }
}
```

Notes:
- `text` is trimmed for no-op behavior; empty text does not render.
- `size` must be between `8` and `120`.
- `position.x` and `position.y` are percentages in the range `0..100`.
- when provided and valid, text is burned directly into GIF frames during trim conversion.

**Validation/error responses**

- `400 { "error": "No video file uploaded.", "code": "MISSING_FILE" }`
- `400 { "error": "Invalid trim values.", "code": "INVALID_TRIM_VALUES" }`
- `400 { "error": "trimEnd must be greater than trimStart.", "code": "INVALID_TRIM_RANGE" }`
- `400 { "error": "Invalid resize preset. Use square, landscape, or portrait.", "code": "INVALID_RESIZE_PRESET" }`
- `400 { "error": "Invalid resize border color. Use a #RRGGBB hex value.", "code": "INVALID_RESIZE_BORDER_COLOR" }`
- `400 { "error": "Invalid text overlay payload.", "code": "INVALID_TEXT_OVERLAY" }`
- `400 { "error": "Invalid text overlay text value.", "code": "INVALID_TEXT_OVERLAY_TEXT" }`
- `400 { "error": "Invalid text overlay size. Must be between 8 and 120.", "code": "INVALID_TEXT_OVERLAY_SIZE" }`
- `400 { "error": "Invalid text overlay color. Use a #RRGGBB hex value.", "code": "INVALID_TEXT_OVERLAY_COLOR" }`
- `400 { "error": "Invalid text overlay position.", "code": "INVALID_TEXT_OVERLAY_POSITION" }`
- `500 { "error": "Failed to trim video.", "code": "TRIM_FAILED" }`

### Apply preset video filter

- **Method:** `POST`
- **Path:** `/api/filter/video`
- **Content-Type:** `multipart/form-data`
- **Field:** `video` (required)

**Form fields**

- `preset` (`noir`, `sepia`, `vivid`, `fade`)

**Validation/error responses**

- `400 { "error": "No video file uploaded.", "code": "MISSING_FILE" }`
- `400 { "error": "Invalid or unsupported preset.", "code": "INVALID_PRESET" }`
- `500 { "error": "Failed to apply video filter.", "code": "VIDEO_FILTER_FAILED" }`

### Export GIF metadata

- **Method:** `POST`
- **Path:** `/api/export/gif`
- **Content-Type:** `application/json`

**Request body**

```json
{
  "mediaId": "gif_..."
}
```

**Validation/error responses**

- `400 { "error": "Missing mediaId.", "code": "MISSING_MEDIA_ID" }`
- `404 { "error": "Media not found or expired.", "code": "MEDIA_NOT_FOUND" }`

## Error response shape

All API errors use this shape:

```json
{
  "error": "Human-readable message",
  "code": "MACHINE_READABLE_CODE"
}
```

## Architecture notes

For module boundaries and reliability standards, see `back-end/docs/backend-architecture.md`.

Storage notes:
- Media binaries are stored in MongoDB GridFS (`media.files` and `media.chunks`).
- Media IDs in API responses map to MongoDB ObjectIds.
- The backend currently exposes media retrieval by ID and explicit delete helpers in code.
- Legacy TTL constants remain in `src/config/constants.js`, but storage is no longer an in-memory TTL store.
