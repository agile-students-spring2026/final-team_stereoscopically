# Backend API

## Overview

This backend provides image-processing endpoints for the StickerCreate app. It is built with Express and stores uploaded/generated media in in-memory storage with a time-to-live (TTL).

## Stack

- Node.js
- Express
- Multer (multipart upload handling)
- Sharp (image processing)

## Setup

```bash
npm install
```

## Scripts

- `npm run dev` - start the API server
- `npm run start` - start the API server

Default server URL: `http://localhost:4000`

## API endpoints

### Health check

- **Method:** `GET`
- **Path:** `/health`

**Success response**

```json
{
  "status": "ok"
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
