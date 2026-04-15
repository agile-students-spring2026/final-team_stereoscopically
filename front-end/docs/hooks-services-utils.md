# Front-End Hooks, Services, and Utils Guide

## Purpose

This document defines the target responsibility boundaries for non-component front-end code in:
- `src/hooks`
- `src/services`
- `src/utils`

It covers:
- what belongs in each folder
- what each layer is responsible for
- what each layer is not responsible for
- workflow ownership across hooks, services, and utilities
- the purpose and scope of target files

This document describes the intended architecture the codebase should follow.

---

## Layer scope

### `src/hooks`

Hooks in `src/hooks` are responsible for:
- orchestrating front-end workflow state
- composing reusable UI-facing logic across components
- coordinating asynchronous calls through service functions
- exposing stable state and action APIs to components
- preserving session continuity across repeated edits within a workflow

Hooks in `src/hooks` are not responsible for:
- rendering UI
- raw API transport details such as `fetch`, request shaping, or endpoint wiring
- acting as the final backend policy authority
- direct DOM interaction that belongs to a component

---

### `src/services`

Services in `src/services` are responsible for:
- backend communication
- endpoint-specific request and response shaping
- transport and backend error normalization
- defining media-processing request contracts with the backend API
- adapting backend responses into stable front-end data shapes

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
- pure data transformations that do not belong to hooks or services

Utilities in `src/utils` are not responsible for:
- backend communication
- orchestration of multi-step workflows
- UI state lifecycle management
- screen-specific interaction behavior

---

## Boundary rules

### Backend authority

The backend is the final authority for media admission and processing constraints.

Front-end validation may provide immediate UX feedback, but backend validation remains required for:
- supported MIME and type checks
- file size limits
- crop and export parameter validity
- conversion eligibility
- text, resize, speed, and filter request validity

---

### Hook and service boundary

Hooks may call services directly.

Components should consume hook state and hook-exposed callbacks rather than importing backend services directly.

Hooks own workflow orchestration.
Services own transport and API contracts.

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

### Session-state boundary

Shared editing state that must survive repeated actions within a workflow belongs in hooks.

Examples include:
- active working media
- selected resize preset
- selected speed option
- selected filter
- text overlay payload
- last successful preview result
- reset and cancel continuity

Components may keep short-lived local interaction state, but hooks own session continuity.

---

## Canonical workflow state

To keep media flows consistent, workflow code should use these concepts clearly:

- **original source**
  - the media first admitted into the editor flow
- **active working media**
  - the current media state that later edits should build on
- **preview media**
  - the media currently shown to the user for review
- **export result**
  - the final processed output returned for download or handoff

Hooks should make ownership of these states explicit.
Services should not manage their lifecycle.
Components should consume them rather than redefine them.

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

### GIF editing session workflow

**Primary owner**
- `hooks/useGifEditingSession.js`

**Responsible for**
- maintaining GIF editing session state across repeated edits
- storing the active working media for GIF workflows
- exposing actions for trim, resize, speed, filters, text, and export orchestration
- preserving preview continuity after GIF mutations
- handling reset and cancel behavior for the GIF session
- delegating processing requests to GIF service functions

**Not responsible for**
- GIF editor UI rendering
- low-level transport implementation details

---

### Image editing session workflow

**Primary owner**
- `hooks/useImageEditingSession.js`

**Responsible for**
- image export and crop orchestration state
- export and crop action handlers used by editor flow components
- image-edit session state that spans screens, such as selected preset, export status, and crop-session continuity
- add-text orchestration for image workflows
- preserving transformed-preview continuity after image mutations

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
- keeping media-processing contracts stable for hook consumers

**Not responsible for**
- screen transitions
- component orchestration
- UI rendering decisions
- session-state lifecycle

---

### Browser capability checks

**Primary owner**
- `utils/videoSupport.js`

**Responsible for**
- browser-level video support checks

**Not responsible for**
- upload orchestration
- API calls
- session-state management

---

## Target file inventory

### `hooks/useMediaSelection.js`

**Purpose**  
Shared media-selection workflow hook for image and video admission and upload bootstrap.

**Responsible for**
- media selection state, including `mediaType`, `selectedMedia`, and preview or source URLs
- front-end preflight checks such as empty file, file type, size, and unsupported formats
- upload kickoff through service functions
- exposing stable actions such as `selectImage`, `selectVideo`, `resetSelection`, and workflow handoff actions

**Not responsible for**
- backend transport details
- final backend policy enforcement
- downstream editing-session state after handoff

---

### `hooks/useGifEditingSession.js`

**Purpose**  
Shared hook for GIF editing session orchestration across trim, resize, speed, filters, text, preview continuity, and export.

**Responsible for**
- maintaining GIF session state such as active working media, preview media, selected resize preset, selected speed, selected filter, and text payload
- exposing editor-facing actions for GIF workflows
- delegating GIF processing and export requests to `backendGifService`
- preserving state continuity after repeated GIF mutations
- resetting or clearing GIF session state safely

**Not responsible for**
- GIF editor screen rendering
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

---

### `services/backendImageService.js`

**Purpose**  
Image-specific backend API contract layer.

**Responsible for**
- image upload, export, crop, and add-text backend calls
- response normalization for image workflows
- adapting backend result payloads into stable front-end data shapes

**Not responsible for**
- component rendering
- screen state management
- workflow orchestration

---

### `services/backendGifService.js`

**Purpose**  
GIF-specific backend API contract layer.

**Responsible for**
- trim processing requests
- resize requests for GIF workflows
- speed-processing requests
- preset-filter requests
- text-overlay requests
- GIF export requests
- normalizing GIF and video API responses for front-end consumption

**Not responsible for**
- trim UI behavior
- editor state management
- screen orchestration

---

### `utils/videoSupport.js`

**Purpose**  
Browser support helper for video MIME playback compatibility.

**Responsible for**
- `File` and MIME capability checks through the browser video API

**Not responsible for**
- upload policy enforcement
- backend calls
- workflow orchestration

---

## Maintenance rules

- keep hooks orchestration-focused and reusable
- keep services focused on transport and API contracts
- keep utilities small, pure, and dependency-light
- prefer one owner per concern
- avoid implementing the same rule across multiple layers
- place backend calls in services and expose them through hooks for component consumption
- keep session continuity in hooks rather than in screen components
- treat this document as the target structure files should move toward
