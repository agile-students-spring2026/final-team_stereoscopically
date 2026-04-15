# Front-End Hooks, Services, and Utils Guide

## Purpose

This document defines responsibility boundaries for non-component front-end code in:
- `src/hooks`
- `src/services`
- `src/utils`

It covers:
- what belongs in each folder
- what each layer is responsible for
- what each layer is not responsible for
- workflow ownership across hooks, services, and utilities
- the purpose and scope of current files

---

## Layer scope

### `src/hooks`

Hooks in `src/hooks` are responsible for:
- orchestrating front-end workflow state
- composing reusable UI-facing logic across components
- coordinating asynchronous calls through service functions
- exposing stable state and action APIs to components

Hooks in `src/hooks` are not responsible for:
- rendering UI
- raw API transport details such as `fetch`, request shaping, or endpoint wiring
- acting as the final backend policy authority

---

### `src/services`

Services in `src/services` are responsible for:
- backend communication
- endpoint-specific request and response shaping
- transport and backend error normalization
- defining media-processing request contracts with the backend API

Services in `src/services` are not responsible for:
- React state management
- component flow orchestration
- direct DOM interaction
- screen-level UI behavior

---

### `src/utils`

Utilities in `src/utils` are responsible for:
- small reusable helper logic
- framework-agnostic computations and checks
- browser capability checks used by higher layers

Utilities in `src/utils` are not responsible for:
- backend communication
- orchestration of multi-step workflows
- UI state lifecycle management

---

## Boundary rules

### Backend authority

The backend is the final authority for media admission and processing constraints.

Front-end validation may provide immediate UX feedback, but backend validation remains required for:
- supported MIME and type checks
- file size limits
- crop and export parameter validity
- conversion eligibility

---

### Hook and service boundary

Hooks may call services directly.

Components should generally consume hooks and callbacks rather than importing backend services directly.

Current exceptions in this codebase:
- filter-focused components that call backend services for immediate interactive preview or apply actions
- container-level media-bridging helpers that adapt backend result URLs into local `File` or object URL data for downstream editor state

---

### Validation boundary

Validation is divided into two layers:

1. **Front-end preflight validation**
   - fast checks for obvious issues before upload or request
   - clear user-facing messages

2. **Backend enforcement validation**
   - final acceptance and rejection decisions
   - security and consistency enforcement

If front-end validation logic is reused across multiple workflows, it should be extracted into shared non-UI helpers.

---

## Workflow ownership

### Selection and admission workflow

**Primary owner**
- `hooks/useMediaSelection.js`

**Responsible for**
- selection state
- front-end preflight checks
- applying selected media to the UI flow
- invoking upload service APIs through service functions

**Not responsible for**
- final admission policy enforcement
- low-level backend transport implementation

---

### GIF conversion orchestration workflow

**Primary owner**
- `hooks/useGifConversion.js`

**Responsible for**
- exposing GIF conversion actions for UI orchestration
- delegating conversion requests to backend service contracts

**Not responsible for**
- GIF editor UI rendering
- transport implementation details

---

### Image editing session orchestration workflow

**Primary owner**
- `hooks/useImageEditingSession.js`

**Responsible for**
- image export and crop orchestration state
- export and crop action handlers used by editor flow components
- image-edit session state that spans screens, such as selected preset, export status, and crop-session continuity

**Not responsible for**
- screen rendering
- low-level backend transport implementation

---

### Backend media API workflow

**Primary owners**
- `services/backendMediaClient.js`
- `services/backendImageService.js`
- `services/backendGifService.js`

**Responsible for**
- calling backend endpoints
- normalizing response objects for front-end consumption
- mapping API failures to user-consumable errors

**Not responsible for**
- screen transitions
- component orchestration
- UI rendering decisions

---

### Browser capability checks

**Primary owner**
- `utils/videoSupport.js`

**Responsible for**
- browser-level video support checks

**Not responsible for**
- upload orchestration
- API calls

---

## File inventory

### `hooks/useMediaSelection.js`

**Purpose**  
Shared media-selection workflow hook for image and video admission and upload bootstrap.

**Responsible for**
- media selection state, including `mediaType`, `selectedMedia`, and preview or source URLs
- front-end preflight checks such as empty file, file type, size, and unsupported formats
- image upload kickoff through `uploadImageToBackend`
- exposing stable actions such as `selectImage`, `selectVideo`, `resetSelection`, and `applyTransformedImage`

**Not responsible for**
- backend transport details
- final backend policy enforcement

---

### `hooks/useGifConversion.js`

**Purpose**  
Shared hook for GIF conversion orchestration actions used by editor components.

**Responsible for**
- exposing conversion actions to components through a hook API
- delegating trim-to-GIF conversion requests to `trimVideoService`, including committed `resizePreset`
- delegating GIF export requests to `exportGifToBackend`

**Not responsible for**
- GIF editor UI state and rendering
- backend transport implementation details

---

### `hooks/useImageEditingSession.js`

**Purpose**  
Shared hook for image editing session orchestration across export and crop interactions.

**Responsible for**
- maintaining image export session state, including selected preset and letterbox state
- handling crop, export, and add-text orchestration through image service functions
- mapping Add Text UI payloads into backend-ready request contracts, including placement coordinates and scaled font size
- maintaining transformed-preview continuity after image mutations
- exposing editor-facing actions and state for image workflows

**Not responsible for**
- UI rendering
- transport implementation details

---

### `services/backendMediaClient.js`

**Purpose**  
Shared low-level backend HTTP client abstraction.

**Responsible for**
- backend base URL resolution
- multipart and JSON POST transport
- backend error payload parsing
- fallback error messaging

**Not responsible for**
- workflow orchestration
- React state management

### `services/backendGifService.js`

**Purpose**
GIF/video backend API contract layer for trim, filter, conversion, and export workflows.

**Responsible for**
- shaping `trimVideoService` multipart payload fields (`trimStart`, `trimEnd`, `resizePreset`)
- normalizing backend responses for GIF/video flows
- preserving API-level constraints as request contracts (without owning UI state)

**Not responsible for**
- editor screen transitions
- draft-versus-committed UI state decisions

---

### `services/backendImageService.js`

**Purpose**  
Image-specific backend API contract layer.

**Responsible for**
- image upload, export, crop, and add-text backend calls
- response normalization for image workflows
- adapting backend result URLs into front-end-usable local media objects where required

**Not responsible for**
- component rendering
- screen state management

---

### `services/backendGifService.js`

**Purpose**  
GIF conversion backend API contract layer.

**Responsible for**
- trim-to-GIF conversion requests
- video preset filter requests
- GIF export requests
- normalizing GIF and video API responses for front-end consumption

**Not responsible for**
- trim UI behavior
- editor state management

---

### `utils/videoSupport.js`

**Purpose**  
Browser support helper for video MIME playback compatibility.

**Responsible for**
- `File` and MIME capability checks through the browser video API

**Not responsible for**
- upload policy enforcement
- backend calls

---

## Maintenance rules

- keep hooks orchestration-focused and reusable
- keep services focused on transport and API contracts
- keep utilities small, pure, and dependency-light
- prefer one owner per concern
- avoid implementing the same rule across multiple layers
- place backend calls in services and expose them through hooks for component consumption
