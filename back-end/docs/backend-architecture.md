# Back-End Architecture Guide

## Purpose

This document defines responsibility boundaries for the back-end code in `back-end/`.

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
- Binary storage model: GridFS (`media.files` + `media.chunks`)

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
- backend validation for crop/export payloads

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
- shared configuration constants (size limits, max dimensions, port)

Also includes:
- legacy TTL constants that are no longer the primary storage lifecycle mechanism

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
- `POST /api/trim/video`
- `POST /api/filter/video`
- `POST /api/export/gif`
- `GET /api/media/:id`
- `GET /api/export/:id/download`

### Ownership notes

- Route declarations are owned by `src/routes/mediaRoutes.js`.
- Request/response orchestration is owned by `src/controllers/mediaController.js`.
- Core endpoint orchestration is owned by `src/services/mediaService.js`.
- Text-overlay payload normalization and rendering helpers are owned by `src/services/textOverlayService.js`.
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
- `GIF_RESIZE_PRESET_DIMENSIONS`

Legacy constants retained for compatibility:
- `MEDIA_TTL_MS`
- `MEDIA_PURGE_INTERVAL_MS`

### `src/routes/mediaRoutes.js`

Purpose:
Define API route map.

Responsible for:
- mapping each media endpoint to its controller

### `src/controllers/mediaController.js`

Purpose:
Controller layer for media endpoints.

Responsible for:
- calling service functions
- converting service results into HTTP responses
- setting binary response headers for media/download routes

### `src/services/mediaService.js`

Purpose:
Core media workflow service layer.

Responsible for:
- upload flow result shaping
- image adjustment and preset-filter orchestration
- crop flow processing and validation
- export flow processing and validation
- video trim and preset-filter orchestration
- resize-preset validation and GIF output-shape mapping for trim-to-GIF flow
- GIF export metadata response shaping
- add-text endpoint orchestration and media result shaping
- media and export download payload assembly

### `src/services/textOverlayService.js`

Purpose:
Text-overlay validation, normalization, and rendering utilities.

Responsible for:
- add-text request payload validation and normalization
- add-text size and placement bounds validation
- supported font fallback and style defaults
- SVG text overlay generation for multiline rendering
- Sharp compositing helpers used by add-text workflow

### `src/services/mediaStore.js`

Purpose:
GridFS media store utilities.

Responsible for:
- create/read/delete media entries
- ObjectId-safe media lookup
- opening GridFS download streams

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
