# Back-End Architecture Guide

## Purpose

This document defines responsibility boundaries for the back-end code in `back-end/`.

For persistence rules and data-shape guarantees, see `back-end/docs/database-contract.md`.

It covers:
- what belongs in each back-end folder
- what each layer is responsible for
- what each layer is not responsible for
- endpoint ownership and validation boundaries
- the purpose and scope of each current back-end file

---

## Stack and runtime scope

- Runtime: Node.js + Express (JavaScript)
- Upload handling: Multer
- Image processing: Sharp
- Video processing: fluent-ffmpeg (+ @ffmpeg-installer/ffmpeg)
- Database: MongoDB Atlas (via Mongoose)
- Binary storage model: GridFS (`media.files` + `media.chunks`) with in-memory fallback for tests and local development

---

## Folder and layer scope

### Root (`back-end/`)

Responsible for:
- server bootstrap entrypoint (`server.js`)
- package/runtime configuration
- high-level backend documentation

Not responsible for:
- endpoint business logic implementation inside `server.js`

### `src/routes`

Responsible for:
- mapping HTTP methods and paths to controller handlers

Not responsible for:
- image processing
- validation/business decisions
- response payload assembly details

### `src/controllers`

Responsible for:
- request/response orchestration
- delegating behavior to services
- mapping service results to HTTP responses

Not responsible for:
- low-level Sharp operations
- media store internals

### `src/services`

Responsible for:
- upload/crop/export business logic
- media store access and media retrieval by ID
- backend validation for all endpoint payloads

Not responsible for:
- route declarations
- Express app bootstrap concerns

### `src/middleware`

Responsible for:
- upload middleware configuration
- centralized error handling

Not responsible for:
- endpoint workflow logic

### `src/config`

Responsible for:
- shared configuration constants (size limits, max dimensions, port, GIF presets)

Not responsible for:
- request handling or business logic

---

## Backend authority boundaries

The backend is the final authority for:
- upload admission (`file` presence, MIME checks, max size)
- crop and export parameter validity
- media existence/expiry checks
- API response and error payload shape

Frontend preflight checks are optional UX helpers and do not replace backend enforcement.

---

## Endpoint ownership

### Current endpoints

- `GET /health`
- `POST /api/upload/image`
- `POST /api/adjust/image`
- `POST /api/filter/image`
- `POST /api/crop/image`
- `POST /api/export/image`
- `POST /api/text/image`
- `POST /api/upload/video`
- `POST /api/trim/video`
- `POST /api/filter/video`
- `POST /api/export/gif`
- `GET /api/media/:id`
- `GET /api/export/:id/download`

### Ownership notes

- Route declarations are owned by `src/routes/mediaRoutes.js`.
- Request/response orchestration is owned by `src/controllers/mediaController.js`.
- Image endpoint logic is owned by `src/services/imageMediaService.js`.
- GIF/video endpoint logic is owned by `src/services/gifMediaService.js`.
- Media retrieval and download logic is owned by `src/services/mediaReadService.js`.
- Shared media load/save utilities are owned by `src/services/mediaUtils.js`.
- Image adjustment and preset-filter math is owned by `src/services/imageAdjustService.js`.
- Text-overlay payload normalization and rendering is owned by `src/services/textOverlayService.js`.
- Media lifecycle state is owned by `src/services/mediaStore.js`.

---

## Error contract

All API errors return JSON in this shape:

```json
{
  "error": "string",
  "code": "string"
}
```

Examples of current validation/service codes include:
- `MISSING_FILE`
- `INVALID_TYPE`
- `MAX_SIZE_EXCEEDED`
- `MISSING_MEDIA_ID`
- `INVALID_ADJUST_PARAMS`
- `INVALID_PRESET`
- `INVALID_CROP_BOUNDS`
- `INVALID_CROP_SIZE`
- `INVALID_CROP_UNIT`
- `INVALID_CROP_SCALE`
- `INVALID_CROP_RATIO`
- `INVALID_TRIM_VALUES`
- `INVALID_TRIM_RANGE`
- `INVALID_RESIZE_PRESET`
- `INVALID_RESIZE_BORDER_COLOR`
- `INVALID_DIMENSIONS`
- `INVALID_LETTERBOX_COLOR`
- `INVALID_TEXT_PAYLOAD`
- `INVALID_POSITION`
- `INVALID_FONT_SIZE`
- `UNSUPPORTED_MEDIA_TYPE`
- `MEDIA_NOT_FOUND`
- `CROP_FAILED`
- `EXPORT_FAILED`
- `ADJUST_FAILED`
- `PRESET_FILTER_FAILED`
- `TRIM_FAILED`
- `VIDEO_FILTER_FAILED`
- `TEXT_RENDER_FAILED`

---

## File inventory

### `server.js`

Purpose:
Express app bootstrap.

Responsible for:
- app creation
- middleware registration
- route mounting
- database connection bootstrap
- server startup

### `src/config/constants.js`

Purpose:
Shared runtime constants.

Responsible for:
- `PORT`
- `MAX_UPLOAD_SIZE_BYTES`
- `MAX_EXPORT_DIMENSION`
- `DEFAULT_GIF_RESIZE_PRESET`
- `DEFAULT_GIF_RESIZE_BORDER_COLOR`
- `GIF_RESIZE_PRESET_DIMENSIONS`

Legacy constants retained for compatibility:
- `MEDIA_TTL_MS`
- `MEDIA_PURGE_INTERVAL_MS`

### `src/routes/mediaRoutes.js`

Purpose:
Define API route map.

Responsible for:
- mapping each media endpoint to its controller handler

### `src/controllers/mediaController.js`

Purpose:
Controller layer for media endpoints.

Responsible for:
- calling service functions
- converting service results into HTTP responses
- setting binary response headers for media/download routes

### `src/services/imageMediaService.js`

Purpose:
Domain service for image workflows.

Responsible for:
- upload image flow
- crop flow processing and validation
- export flow processing and validation
- image adjustment orchestration
- preset image filter orchestration
- add-text endpoint orchestration

### `src/services/gifMediaService.js`

Purpose:
Domain service for GIF and video workflows.

Responsible for:
- upload video flow
- trim-video-to-GIF flow, including resize preset and border color validation, text overlay parsing, and ffmpeg filter assembly
- preset video filter orchestration
- GIF export metadata response shaping

### `src/services/mediaReadService.js`

Purpose:
Domain service for media retrieval and download.

Responsible for:
- serving media buffers with correct content-type headers
- serving export download buffers with content-disposition headers

### `src/services/mediaUtils.js`

Purpose:
Shared utilities for media load and save across domain services.

Responsible for:
- `loadMedia` — retrieve a stored media entry as a buffer with metadata
- `saveMedia` — write a buffer to the media store and return its ID
- `buildMediaUrl` / `buildExportDownloadUrl` — construct canonical media URLs
- `parseLetterboxBackground` — validate and parse letterbox color values
- `parseCropParams` — validate and normalize crop parameter inputs

### `src/services/imageAdjustService.js`

Purpose:
Low-level image adjustment math.

Responsible for:
- applying brightness, contrast, saturation, hue, grayscale, sepia, and sharpness adjustments to image buffers via Sharp
- defining `PRESET_ADJUSTMENTS` — the named adjustment configurations for preset filters

### `src/services/textOverlayService.js`

Purpose:
Text-overlay validation, normalization, and rendering.

Responsible for:
- add-text request payload validation and normalization
- size and placement bounds validation
- supported font fallback and style defaults
- SVG text overlay generation for multiline rendering
- Sharp compositing helpers used by add-text workflow

### `src/services/mediaStore.js`

Purpose:
Media persistence utilities.

Responsible for:
- creating media entries in GridFS, with in-memory fallback when GridFS is unavailable
- reading media file info by ID
- opening GridFS download streams, with in-memory fallback
- deleting media entries by ID

### `src/middleware/uploadMiddleware.js`

Purpose:
Upload middleware configuration.

Responsible for:
- memory storage upload parser
- max file size constraints

### `src/middleware/errorMiddleware.js`

Purpose:
Shared error response middleware.

Responsible for:
- file-size error normalization
- unexpected error fallback payloads
- route-not-found response payload

---

## Maintenance rules

- Keep `server.js` bootstrap-only.
- Keep route files declaration-only.
- Keep controllers thin and orchestration-focused.
- Keep processing and validation logic in services.
- Keep constants centralized in `src/config/constants.js`.
- Keep API error shape stable across endpoints.
- Keep backend validation authoritative even if frontend prechecks exist.
