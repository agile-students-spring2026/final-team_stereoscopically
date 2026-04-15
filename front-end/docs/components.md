# Front-End Component Guide

## Purpose

This document defines the target responsibility boundaries for components in `src/components`.

It covers:
- what belongs in `src/components`
- what components are responsible for
- what components are not responsible for
- the purpose and scope of each current component

This document describes the intended component architecture the codebase should follow.

For shared editor layout/style naming conventions, see `docs/ui-consistency.md`.

---

## `src/components` scope

Components in `src/components` are responsible for:
- rendering UI
- managing local UI state
- handling user interactions tied to rendered views
- emitting user actions upward through props or callbacks
- presenting hook-provided state and actions clearly to the user

Components in `src/components` are not responsible for:
- cross-screen orchestration unless the component is explicitly a container
- shared business logic reused across multiple screens
- duplicated validation already handled upstream
- backend service imports or transport logic
- large helper logic not directly tied to rendering or interaction

---

## Mode-based folder layout

Components are organized by media mode:

- `src/components/image/`
  - `ImageEditor.jsx`
  - `ImageCropper.jsx`
  - `PresetSizes.jsx`
  - `PresetFilters.jsx`
  - `ColorFilters.jsx`
  - `AddText.jsx`
- `src/components/gif/`
  - `GifEditor.jsx`
  - `VideoPresetFilters.jsx`
  - `GifFilterMain.jsx`
  - `GifTextOverlayEditor.jsx`
- `src/components/` (shared / orchestration)
  - `EditorContainer.jsx`
  - `MediaEntry.jsx`
  - `FilterMain.jsx`
  - `FilterScreen.jsx`
  - `CameraCapture.jsx`
  - `PhotoPreview.jsx`

---

## Workflow boundaries

### GIF workflow

**Components**
- `gif/GifEditor.jsx`
- `gif/VideoPresetFilters.jsx`
- `gif/GifFilterMain.jsx`
- `gif/GifTextOverlayEditor.jsx`

**Responsible for**
- video and GIF preview UI
- trim and edit controls shown on the GIF screens
- live text overlay preview rendering in the GIF editor based on active text settings
- local interaction state tied to the rendered GIF editing screen
- processing, success, and failure messaging shown during GIF editing
- emitting user edit intent through props and callbacks

**Not responsible for**
- upload validation already handled earlier in the flow
- admission checks performed during media selection
- shared non-UI helper logic
- backend conversion implementation
- long-lived GIF session state that should be owned by hooks

---

### Image workflow

**Components**
- `image/ImageEditor.jsx`
- `image/ImageCropper.jsx`
- `image/PresetSizes.jsx`
- `image/PresetFilters.jsx`
- `image/ColorFilters.jsx`
- `image/AddText.jsx`

**Responsible for**
- image editing UI and interaction behavior
- crop interactions
- output size selection
- image-edit messaging specific to these screens

**Not responsible for**
- screen orchestration across the editor flow
- shared routing between media types
- backend media-processing implementation
- long-lived editing-session state that belongs in hooks

---

### Shared editor flow

**Components**
- `EditorContainer.jsx`
- `MediaEntry.jsx`
- `FilterMain.jsx`
- `FilterScreen.jsx`

**Responsible for**
- screen transitions and editor flow coordination
- media selection entry points
- wiring hook state and hook callbacks into child components
- routing between image and GIF workflows
- shared filter navigation and layout used across filter screens

**Not responsible for**
- deep media-specific editing behavior
- low-level interaction logic owned by dedicated editor screens
- reusable non-UI helper logic that should be extracted elsewhere
- backend result adaptation logic that should live in hooks or services
- acting as a catch-all owner for editor business rules

---

### Capture flow

**Components**
- `CameraCapture.jsx`
- `PhotoPreview.jsx`

**Responsible for**
- camera stream lifecycle
- photo capture and video recording interactions
- preview, confirm, retake, and cancel actions for captured media

**Not responsible for**
- downstream editor behavior after media is confirmed
- broader editor flow orchestration outside the capture path

---

## Filter ownership rule

Filter behavior is split across layers as follows:

- **shared filter components** own layout and navigation only
  - examples: `FilterMain.jsx`, `FilterScreen.jsx`
- **mode-specific filter components** own filter-specific UI controls only
  - examples: `PresetFilters.jsx`, `ColorFilters.jsx`, `VideoPresetFilters.jsx`
- **hooks** own preview/apply orchestration and session continuity
- **services** own transport and backend request contracts

Filter components should emit user intent and display state.
They should not import backend services directly.

---

## Component inventory

### `EditorContainer.jsx`

**Purpose**
Top-level container for editor screen flow.

**Responsible for**
- screen selection and transitions
- wiring child components together
- reading hook-managed state and passing it down to screens
- passing hook-exposed callbacks between screens
- coordinating editor-level flow between media entry, capture, image editing, GIF editing, and export handoff

**Not responsible for**
- large reusable helper logic
- low-level media-processing logic
- file-admission decision rules such as type, size, and format support
- backend result adaptation logic
- deep media-specific session logic that belongs in hooks
- UI behavior that belongs entirely to a child component

**Notes**
- Keep this component orchestration-focused.
- Treat it as a flow coordinator, not as a business-logic owner.

---

### `MediaEntry.jsx`

**Purpose**
Entry screen for starting a new edit flow.

**Responsible for**
- upload entry points for image and video
- camera entry point
- local selection and validation messaging tied to this screen
- selection-time rejection modal UI such as unsupported type or size limit
- re-upload and retry interactions tied to image and video picker controls

**Not responsible for**
- editor flow logic beyond the initial user choice
- media transformation logic
- persistent editing-session state

---

### `ImageEditor.jsx`

**Purpose**
Primary editing screen for image-based workflows.

**Responsible for**
- image preview display
- image editing controls shown on this screen
- crop flow coordination at the screen level, including open, apply, and cancel UX
- applying edits initiated from image-specific UI through callback props

**Not responsible for**
- crop-box pointer logic
- reusable helper logic unrelated to this screen
- backend media-processing implementation details
- long-lived image session state that belongs in hooks

**Notes**
- Keep screen-level editing behavior here.
- Keep crop interaction details in `ImageCropper.jsx`.

---

### `ImageCropper.jsx`

**Purpose**
Interactive crop-box UI for image cropping.

**Responsible for**
- crop box rendering
- drag and resize interactions
- crop area updates from pointer input
- restoring and clamping an incoming initial crop box for the current container
- emitting crop payloads for parent orchestration, including pixel box and normalized ratio

**Not responsible for**
- screen orchestration
- non-crop editing flows
- backend submission logic

**Notes**
- Keep measurement and boundary-clamping logic inside this component.
- Keep payload shape stable so parent components can remain orchestration-focused.

---

### `GifEditor.jsx`

**Purpose**
Editing screen for video-to-GIF workflows.

**Responsible for**
- video and GIF preview display shown on this screen
- trim, resize, speed, filter, and text controls presented in this screen area
- local interaction state tied to rendered controls
- processing feedback for the user
- emitting edit intent through callback props

**Not responsible for**
- duplicated validation already handled upstream
- selection-time media admission checks such as file type, size, or browser support
- generic logic that should be shared with other editors
- backend conversion logic
- long-lived GIF session continuity that belongs in hooks

**Notes**
- Keep this file screen-focused.
- Put reusable GIF session orchestration in hooks rather than growing it here.

---

### `VideoPresetFilters.jsx`

**Purpose**
Preset filter selection screen for video workflows.

**Responsible for**
- rendering video preset options
- collecting filter selection input
- displaying filter-specific preview and apply UI state passed down from hooks
- emitting the selected filter intent back to parent orchestration

**Not responsible for**
- GIF trim controls
- overall editor screen orchestration
- backend transport implementation details
- direct service imports

---

### `CameraCapture.jsx`

**Purpose**
Camera capture interface for photo and video input.

**Responsible for**
- camera stream lifecycle
- capture interactions
- recording interactions
- local capture state tied to browser camera behavior

**Not responsible for**
- post-capture editing flow
- preview confirmation behavior after capture is complete

---

### `PhotoPreview.jsx`

**Purpose**
Preview screen for captured media before continuing.

**Responsible for**
- preview display
- confirm, retake, and cancel actions

**Not responsible for**
- capture lifecycle logic
- downstream editing behavior

---

### `FilterMain.jsx`

**Purpose**
Navigation screen for filter-related editing options.

**Responsible for**
- presenting available filter categories
- routing the user to the chosen filter flow

**Not responsible for**
- detailed implementation of each filter type
- preview or apply orchestration
- backend communication

---

### `FilterScreen.jsx`

**Purpose**
Shared layout wrapper for filter sub-screens.

**Responsible for**
- common page structure for filter screens
- title and header display
- preview region layout
- shared apply and cancel action layout
- optional overlay passthrough used by filter-specific UIs

**Not responsible for**
- filter-specific state or transformation logic
- preview/apply orchestration logic
- backend communication

**Notes**
- Use this as a shell, not as a place for filter logic.

---

### `PresetFilters.jsx`

**Purpose**
UI for selecting predefined visual filter presets.

**Responsible for**
- preset option display
- local preset selection
- emitting the selected preset payload

**Not responsible for**
- filter-processing implementation
- preview/apply orchestration
- unrelated editing controls

---

### `ColorFilters.jsx`

**Purpose**
UI for manual color adjustment controls.

**Responsible for**
- slider-based adjustment controls
- local adjustment state
- emitting the color adjustment payload

**Not responsible for**
- preset selection logic
- transformation implementation outside the UI contract
- preview/apply orchestration owned by hooks

---

### `AddText.jsx`

**Purpose**
UI for adding text overlays to media.

**Responsible for**
- text input controls
- font and numeric size controls
- interactive placement selection on the shared preview surface
- constraining placement interaction to the rendered media bounds inside the preview container
- showing a local overlay preview so users can position text before apply
- emitting the text-edit payload

**Not responsible for**
- rendering final media output
- final text-validation authority
- broader editor orchestration
- backend submission logic

---

### `PresetSizes.jsx`

**Purpose**
UI for choosing output size presets.

**Responsible for**
- preset size selection
- letterbox color selection
- emitting selected output settings

**Not responsible for**
- resize implementation logic
- unrelated editing state
- preview/apply orchestration owned by hooks

---

## Maintenance rules

- keep screen components focused on one screen or one interaction area
- keep low-level interaction logic close to the component that uses it
- extract shared non-UI logic when multiple components depend on it
- avoid mixing orchestration, rendering, and helper logic in the same file when those concerns start to grow
- keep long-lived workflow state in hooks, not in screen components
- treat this document as the target structure files should move toward