The back-end of your project will live in this directory.

You will most likely initiate the back-end Node.js/Express.js server by running the "npm init" command from within this directory.

## GIF Conversion API Contract

This project exposes a dedicated endpoint for converting a user-uploaded video file into a GIF. The front-end and back-end agree on the following contract so they can evolve independently without breaking each other.

### Endpoint

- **Method**: `POST`
- **Path**: `/api/convert/gif`

### Request

- **Content-Type**: `multipart/form-data`
- **Fields**:
	- `video`: required; the uploaded video file (e.g., an MP4).

Back-end responsibilities:

- Validate that a file was provided.
- Validate that the file is a supported video type and within allowed size limits.
- Perform the conversion from video to GIF (or queue this work) and produce a usable GIF reference.

### Successful Response (HTTP 200)

The back-end returns JSON describing the generated GIF media. The front-end treats this as a stable reference it can render or store.

```json
{
	"id": "string",          // Unique identifier for the generated GIF
	"type": "gif",           // Media type; always "gif" for this endpoint
	"url": "string",         // URL where the GIF can be accessed
	"duration": 0,            // Optional: duration of the GIF in seconds
	"width": 0,               // Optional: pixel width of the GIF
	"height": 0,              // Optional: pixel height of the GIF
	"size": 0                 // Optional: approximate file size in bytes
}
```

Fields marked "Optional" may be omitted if the back-end does not compute them, but when present they should follow the types listed above.

### Error Responses

For all error cases, the back-end returns a non-200 status code and a JSON body with at least an `error` message. The `code` field is optional but recommended for front-end handling.

```json
{
	"error": "string",       // Human-readable description of what went wrong
	"code": "string"         // Optional machine-readable code (e.g., "INVALID_TYPE")
}
```

Examples:

- **400 Bad Request** – validation failures
	- No file provided
	- Unsupported MIME type (not a video)
	- File too large
- **500 Internal Server Error** – unexpected server failures during processing

The front-end will:

- Treat any non-2xx status as a failure.
- Prefer using the `error` string for user-facing messages.
- Optionally use the `code` field to map specific cases to custom UI (e.g., a special message for `MAX_SIZE_EXCEEDED`).

## Image Upload API Contract

This project also exposes an endpoint for uploading a user-selected image so the back-end can return a stable media reference for editing.

### Endpoint

- **Method**: `POST`
- **Path**: `/api/upload/image`

### Request

- **Content-Type**: `multipart/form-data`
- **Fields**:
	- `file`: required; the uploaded image file.

> The field name for image uploads is **`file`** and should be used consistently by both front-end and back-end.

Back-end responsibilities:

- Validate that an image file was provided.
- Validate supported MIME type and size constraints.
- Return media data that the front-end can directly use for editing.

### Successful Response (HTTP 200)

The back-end returns JSON representing the uploaded image media reference.

```json
{
	"id": "string",           // Unique identifier for uploaded media
	"type": "image",          // Media type; always "image" for this endpoint
	"url": "string",          // URL or usable reference for the image
	"mimeType": "string",     // Optional: image MIME type
	"width": 0,                // Optional: pixel width
	"height": 0,               // Optional: pixel height
	"size": 0                  // Optional: file size in bytes
}
```

Optional metadata fields may be omitted when unavailable.

### Error Responses

For all error cases, the back-end returns a non-200 status code and JSON with at least an `error` message.

```json
{
	"error": "string",        // Human-readable error message
	"code": "string"          // Optional machine-readable code (e.g., "INVALID_TYPE")
}
```

Examples:

- **400 Bad Request** – validation failures
	- No file provided
	- Unsupported MIME type (not an image)
	- File too large
- **500 Internal Server Error** – unexpected upload/processing failures

## Reframe/Crop Audit (No Behavior Changes)

Date audited: 2026-04-09

Scope: `/api/crop/image` correctness audit only (validation, source lookup, response consistency, status codes, TTL/store behavior).

### Checklist results

1. **Crop endpoint validation is complete (`mediaId`, bounds, dimensions, scale)**

- **Status:** ❌ Not fully complete
- **What was observed:**
	- `mediaId` missing correctly returns `400` + `MISSING_MEDIA_ID`.
	- Invalid/missing numeric crop bounds (`x`,`y`,`width`,`height`,`scaleX`,`scaleY`) are not explicitly validated and currently fall through to `500 CROP_FAILED`.

2. **Reads source by backend media ID (not client URL trust)**

- **Status:** ✅ Verified
- **What was observed:**
	- Crop lookup uses `inMemoryMediaStore.get(mediaId)` from request body.
	- No client URL is used for source resolution.

3. **Returns a new media result object consistently**

- **Status:** ⚠️ Partially verified
- **What was observed:**
	- Success path is implemented to create a new `cropId` and store new media.
	- During live endpoint checks, valid crop input returned `500 CROP_FAILED`, so successful response consistency could not be verified end-to-end in this audit run.

4. **Error codes/statuses are stable and documented**

- **Status:** ⚠️ Partially verified
- **What was observed:**
	- `MISSING_MEDIA_ID` and `MEDIA_NOT_FOUND` are stable in code.
	- Invalid bounds/dimensions currently map to generic `500 CROP_FAILED` instead of stable `400` validation codes.
	- Crop endpoint error codes are not yet documented in this README.

5. **TTL/store behavior doesn’t break chained edits**

- **Status:** ✅ Verified (store-level behavior)
- **What was observed:**
	- Crop path uses same in-memory store with `expiresAt` TTL assignment.
	- Existing and newly created media entries coexist until expiry (no eager deletion on success).

### Evidence summary (HTTP checks)

- `GET /health` → `200`
- `POST /api/crop/image` with `{}` → `400 { code: "MISSING_MEDIA_ID" }`
- `POST /api/crop/image` with valid numeric crop payload → `500 { code: "CROP_FAILED" }`
- `POST /api/crop/image` with missing/invalid numeric bounds → `500 { code: "CROP_FAILED" }`

### Follow-up commits (separate, small/safe)

No API redesign required. Suggested narrow fixes:

- `fix(backend): return 400 validation errors for invalid crop bounds and scales`
- `fix(backend): make crop happy-path deterministic and verify successful media generation`
- `docs(backend): document crop endpoint request/response and stable error codes`

### Audit conclusion

- Backend crop/reframe flow is **partially correct**.
- Source-ID trust model and TTL-store chaining are good.
- Crop validation and successful crop execution need targeted fixes before marking endpoint fully correct.
