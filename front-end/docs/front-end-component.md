# Front-End Component Guide

## Purpose

This document describes the responsibility boundaries for components in `src/components`.

It covers:
- what belongs in `src/components`
- what components should own
- what components should avoid
- the purpose and responsibility of each current component

This document does not cover ownership for:
- `hooks`
- `services`
- `utils`

---

## `src/components` responsibility

Components in `src/components` are responsible for:
- rendering UI
- managing local UI state
- handling user interactions tied to the rendered view
- sending user actions upward through callbacks or props

Components in `src/components` are not responsible for:
- cross-screen orchestration unless they are a container component
- shared business logic that is reused across multiple screens
- duplicated validation logic that already exists upstream
- large helper logic that is not directly tied to rendering or interaction

---

## Component inventory

### `EditorContainer.jsx`

**Purpose**  
Top-level editor container for front-end screen flow.

**Owns**
- screen selection and transitions
- wiring child components together
- passing media state and callbacks between screens
- coordinating editor-level UI flow

**Should not own**
- large reusable helper logic
- low-level media processing logic
- UI behavior that belongs entirely to a child component

**Notes**
- This component should stay focused on orchestration.
- If non-UI helpers continue to grow here, they should be extracted.

---

### `CreateNew.jsx`

**Purpose**  
Entry screen for starting a new edit flow.

**Owns**
- upload entry points for image and video
- camera entry point
- local selection and validation messaging tied to this screen

**Should not own**
- editor flow logic beyond initial user choice
- media transformation logic

---

### `ImageEditor.jsx`

**Purpose**  
Primary editing screen for image-based workflows.

**Owns**
- image preview display
- image editing controls shown on this screen
- reframe flow coordination at the screen level
- applying edits initiated from image-specific UI

**Should not own**
- crop-box pointer logic
- reusable helper logic unrelated to this screen
- backend/media-processing implementation details

**Notes**
- Keep screen-level editing behavior here.
- Keep crop interaction details in `ImageCropper.jsx`.

---

### `ImageCropper.jsx`

**Purpose**  
Interactive crop-box UI for image reframing.

**Owns**
- crop box rendering
- drag and resize interactions
- crop area updates from pointer input

**Should not own**
- screen orchestration
- non-crop editing flows
- backend submission logic

---

### `GifEditor.jsx`

**Purpose**  
Editing screen for video-to-GIF workflows.

**Owns**
- video/GIF preview state shown on this screen
- trim controls
- conversion-related UI state
- processing feedback for the user

**Should not own**
- duplicated validation already handled upstream
- generic logic that should be shared with other editors
- backend conversion logic itself

**Notes**
- Watch for overlap with image-editing patterns if shared behavior grows.

---

### `CameraCapture.jsx`

**Purpose**  
Camera capture interface for photo and video input.

**Owns**
- camera stream lifecycle
- capture interactions
- recording interactions
- local capture state tied to browser camera behavior

**Should not own**
- post-capture editing flow
- preview confirmation behavior after capture is complete

---

### `PhotoPreview.jsx`

**Purpose**  
Preview screen for captured media before continuing.

**Owns**
- preview display
- confirm, retake, and cancel actions

**Should not own**
- capture lifecycle logic
- downstream editing behavior

---

### `FilterMain.jsx`

**Purpose**  
Navigation screen for filter-related editing options.

**Owns**
- presenting available filter categories
- routing the user to the chosen filter flow

**Should not own**
- detailed implementation of each filter type
- shared filter layout behavior handled elsewhere

---

### `FilterScreen.jsx`

**Purpose**  
Shared layout wrapper for filter sub-screens.

**Owns**
- common page structure for filter screens
- title/header display
- preview region layout
- shared apply/cancel action layout

**Should not own**
- filter-specific state or transformation logic

**Notes**
- Use this as a shell, not as a place for filter logic.

---

### `PresetFilters.jsx`

**Purpose**  
UI for selecting predefined visual filter presets.

**Owns**
- preset option display
- local preset selection
- emitting selected preset payload

**Should not own**
- actual filter-processing implementation
- unrelated editing controls

---

### `ColorFilters.jsx`

**Purpose**  
UI for manual color adjustment controls.

**Owns**
- slider-based adjustment controls
- local adjustment state
- emitting color adjustment payload

**Should not own**
- preset selection logic
- transformation implementation outside the UI contract

---

### `AddText.jsx`

**Purpose**  
UI for adding text overlays to media.

**Owns**
- text input controls
- font, size, and position controls
- emitting text-edit payload

**Should not own**
- rendering final media output logic
- broader editor orchestration

---

### `PresetSizes.jsx`

**Purpose**  
UI for choosing output size presets.

**Owns**
- preset size selection
- letterbox color selection
- emitting selected output settings

**Should not own**
- resize implementation logic
- unrelated editing state

---


## Maintenance rules

- Keep screen components focused on one screen or one interaction area.
- Keep low-level interaction logic close to the component that uses it.
- Extract shared non-UI logic when multiple components depend on it.
- Avoid mixing orchestration, rendering, and helper logic in the same file when those concerns start to grow.
