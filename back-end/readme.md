# Backend API

REST API for **StickerCreate**: JWT auth, profiles, follow graph, home feed, private feed bookmarks, creations (drafts / exports / publish), likes, and image/video tooling (Sharp, ffmpeg) with media in **MongoDB GridFS**.

## Stack

Node.js, Express, Mongoose, Multer, Sharp, fluent-ffmpeg, bcrypt, jsonwebtoken.

## Setup

```bash
npm install
cp .env.example .env
```

Set **`MONGODB_URI`** and **`JWT_SECRET`** (and optional **`JWT_EXPIRES_IN`**, default `7d`). Never commit real secrets.

**Auth (summary):** Register/login hash passwords with bcrypt; JWT is **HS256**; `express-validator` on auth bodies; **`GET /api/me`** for the current user. Aliases: **`/api/auth/register`** & **`/api/auth/signup`**; **`/api/auth/login`** & **`/api/auth/signin`**. Integration tests need **`MONGODB_URI`** + **`JWT_SECRET`** in the environment.

## Scripts

| Command | Purpose |
|--------|---------|
| `npm run dev` / `npm start` | API server (default **`http://localhost:4000`**) |
| `npm test` | Mocha (`test/**/*.test.js` + `test/integration-root.mjs`) |
| `npm run coverage` | c8 report over **`./src`** |
| `npm run coverage:check` | Same run with **coverage thresholds** (see repo `instructions-2-back-end.md`) |

**Feed bookmarks (signed-in):** **`GET /api/me/feed`** returns `{ creations }` where each item may include **`isSaved`**. **`POST /api/me/saved-feed-creations/:creationId`** and **`DELETE /api/me/saved-feed-creations/:creationId`** toggle a private bookmark (published item from someone you follow; no notification to the author).

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

### Register / sign-up

- **Methods:** `POST`
- **Paths:** `/api/auth/register`, `/api/auth/signup`

**JSON body**

- `email` (required string, normalized and validated).
- `password` (required string, 8–128 characters).
- `displayName`, `bio`, `avatarUrl` (optional; `avatarUrl` must be `http(s):` **or** an uploaded media path `/api/media/<24-hex ObjectId>`).

Success **`201`** response:

```json
{
  "token": "<jwt>"
}
```

Duplicate email **`409`** with `{ "error": "Email already in use." }`.

### Login / sign-in

- **Methods:** `POST`
- **Paths:** `/api/auth/login`, `/api/auth/signin`

**JSON body**: `email`, `password`

Success **`200`**: `{ "token": "<jwt>" }`. Wrong credential **`401`**: `{ "error": "Invalid credentials." }`.

### Current account

- **Method:** `GET`
- **Path:** `/api/me`
- **Headers:** `Authorization: Bearer <jwt>`

**Success `200`**

```json
{
  "id": "...",
  "email": "...",
  "displayName": "",
  "avatarUrl": "",
  "bio": ""
}
```

### Change email

- **Method:** `PATCH`
- **Path:** `/api/me/email`
- **Headers:** `Authorization: Bearer <jwt>`
- **JSON body:** `email`

Success **`200`**:

```json
{
  "token": "<fresh-jwt>"
}
```

Duplicate email **`409`** with `{ "error": "Email already in use." }`.

### Change password

- **Method:** `PATCH`
- **Path:** `/api/me/password`
- **Headers:** `Authorization: Bearer <jwt>`
- **JSON body:** `currentPassword`, `newPassword` (`8-128` chars)

Success **`200`**:

```json
{
  "message": "Password changed successfully. You can keep using this session, or sign out if you are on a shared device."
}
```

Wrong current password **`401`** with `{ "error": "Invalid credentials." }`.

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
- `resizeBorderColor` (optional: `#RRGGBB` or `transparent`)
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

### Creations (drafts / exports)

These routes use **optional JWT**: if `Authorization: Bearer <jwt>` is present, it must be valid (otherwise **`401`**). This lets the same paths serve **signed-in** users (scoped by `userId`) and **guests** (scoped by browser `ownerKey`).

Implementation: `optionalAuth` + `creationController`.

#### List creations

- **Method:** `GET`
- **Path:** `/api/creations`

**Signed in (valid Bearer)**  
Lists all creations whose `userId` matches the JWT user. **Do not rely on query `ownerKey`** for scoping.

**Guest (no Bearer)**  
Requires query: `?ownerKey=<non-empty-string>`. Returns creations with that `ownerKey` **and no bound account** (`userId` absent or null). Legacy drafts created before accounts only stored `ownerKey`; they remain visible here.

**Errors**

- `400 { "error": "Missing or invalid ownerKey.", "code": "INVALID_OWNER_KEY" }` — guest list without a usable `ownerKey`.

#### Create creation

- **Method:** `POST`
- **Path:** `/api/creations`
- **Content-Type:** `application/json`

**Body (common)**

- `title` (required, non-empty after trim; max **200** characters).
- `editorPayload` (required object).
- `status` (optional): `draft` | `exported` (default `draft`).
- `exportAssetId` (optional string).

**Signed in**

- Document is stored with **`userId`** set to the current user.
- Do **not** send a meaningful `ownerKey` in the body. Non-empty/non-whitespace `ownerKey` is rejected with **`400`** `INVALID_OWNER_KEY` (“Signed-in clients must not send ownerKey.”).

**Guest**

- Body **must include** `ownerKey` (non-empty after trim).

**Success **`201`**:** creation document JSON (Mongo fields including `_id`).

#### Get / update / delete one creation

- **GET** `/api/creations/:id`
- **PATCH** `/api/creations/:id`
- **DELETE** `/api/creations/:id`

**Signed in**

- Allowed only if the creation’s **`userId`** equals the JWT user (`403 FORBIDDEN` otherwise). Not found **`404`** if id missing.

**Guest**

- Allowed only for **guest** creations (document has **`ownerKey`**, **`userId` not set**) **and** when query **`ownerKey`** matches that document.

**Important for guests**

- **`GET`/`PATCH`/`DELETE`** must include `?ownerKey=...` (same value used at create/list time). Omitting or wrong key: **`403`** with `OWNER_KEY_REQUIRED` or `FORBIDDEN`.

**PATCH body**

- Same fields as create where applicable (`title`, `editorPayload`, `status`, `exportAssetId`). Partial updates follow controller merge rules (`trackedMediaIds` union, etc.).

**DELETE**

- Deletes the creation document and best-effort deletes associated GridFS media referenced by the payload/export.

Persists drafts and exports referenced from the frontend “My Creations” and editor flows. See `docs/database-contract.md` for the `creations` document shape.

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
