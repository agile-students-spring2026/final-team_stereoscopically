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
