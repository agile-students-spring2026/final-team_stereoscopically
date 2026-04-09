# Front-End Component Guide

## Purpose

This document defines responsibility boundaries for components in `src/components`.

It covers:
- what belongs in `src/components`
- what components are responsible for
- what components are not responsible for
- the purpose and scope of each current component

This document does not cover ownership for:
- `hooks`
- `services`
- `utils`

---

## `src/components` scope

Components in `src/components` are responsible for:
- rendering UI
- managing local UI state
- handling user interactions tied to rendered views
- emitting user actions upward through props or callbacks

Components in `src/components` are not responsible for:
- cross-screen orchestration unless the component is explicitly a container
- shared business logic reused across multiple screens
- duplicated validation already handled upstream
- large helper logic not directly tied to rendering or interaction

---

## Workflow boundaries

### GIF workflow

**Components**
- `GifEditor.jsx`

**Responsible for**
- video and GIF preview UI
- trim controls
- conversion-related UI state
- edit-time interaction checks tied to this screen
- processing, success, and failure messaging shown during GIF editing

**Not responsible for**
- upload validation already handled earlier in the flow
- admission checks performed during media selection
- shared non-UI helper logic
- backend conversion implementation

---

### Image workflow

**Components**
- `ImageEditor.jsx`
- `ImageCropper.jsx`
- `PresetSizes.jsx`

**Responsible for**
- image editing UI and interaction behavior
- crop interactions
- output size selection
- image-edit messaging specific to these screens

**Not responsible for**
- screen orchestration across the editor flow
- shared routing between media types
- backend media-processing implementation

---

### Shared editor flow

**Components**
- `EditorContainer.jsx`
- `MediaEntry.jsx`
- `FilterMain.jsx`
- `FilterScreen.jsx`
- `AddText.jsx`
- `PresetFilters.jsx`
- `ColorFilters.jsx`

**Responsible for**
- screen transitions and editor flow coordination
- media selection entry points
- passing selection outcomes and actions to selection UI components
- wiring between image and GIF workflows
- shared filter navigation and layout used across filter screens
- shared filter controls intended to be available across media types

**Not responsible for**
- deep media-specific editing behavior
- low-level interaction logic owned by dedicated editor screens
- reusable non-UI helper logic that should be extracted elsewhere

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

## Component inventory

### `EditorContainer.jsx`

**Purpose**
Top-level container for editor screen flow.

**Responsible for**
- screen selection and transitions
- wiring child components together
- passing media state and callbacks between screens
- coordinating editor-level UI flow
- mapping upstream media-selection validation outcomes to selection-flow state and callbacks
- crop apply orchestration, including service calls and success or error UI state
- image source decisions for crop flows, including original source versus current preview
- persisted crop-session state that spans screens, such as the last crop box

**Not responsible for**
- large reusable helper logic
- low-level media-processing logic
- file-admission decision rules (type, size, format support)
- UI behavior that belongs entirely to a child component

**Notes**
- Keep this component focused on orchestration.
- Extract non-UI helpers if they continue to grow here.

---

### `MediaEntry.jsx`

**Purpose**
Entry screen for starting a new edit flow.

**Responsible for**
- upload entry points for image and video
- camera entry point
- local selection and validation messaging tied to this screen
- selection-time rejection modal UI (unsupported type, size limit)
- re-upload and retry interactions tied to image/video picker controls

**Not responsible for**
- editor flow logic beyond the initial user choice
- media transformation logic

---

### `ImageEditor.jsx`

**Purpose**
Primary editing screen for image-based workflows.

**Responsible for**
- image preview display
- image editing controls shown on this screen
- crop flow coordination at the screen level, including open, apply, and cancel UX
- applying edits initiated from image-specific UI

**Not responsible for**
- crop-box pointer logic
- reusable helper logic unrelated to this screen
- backend media-processing implementation details

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
- video and GIF preview state shown on this screen
- trim controls
- conversion-related UI state
- processing feedback for the user

**Not responsible for**
- duplicated validation already handled upstream
- selection-time media admission checks (file type, size, browser support)
- generic logic that should be shared with other editors
- backend conversion logic

**Notes**
- Watch for overlap with image-editing patterns if shared behavior grows.

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
- shared filter layout behavior handled elsewhere

---

### `FilterScreen.jsx`

**Purpose**
Shared layout wrapper for filter sub-screens.

**Responsible for**
- common page structure for filter screens
- title and header display
- preview region layout
- shared apply and cancel action layout

**Not responsible for**
- filter-specific state or transformation logic

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

---

### `AddText.jsx`

**Purpose**
UI for adding text overlays to media.

**Responsible for**
- text input controls
- font, size, and position controls
- emitting the text-edit payload

**Not responsible for**
- rendering final media output
- broader editor orchestration

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

---

## Maintenance rules

- Keep screen components focused on one screen or one interaction area.
- Keep low-level interaction logic close to the component that uses it.
- Extract shared non-UI logic when multiple components depend on it.
- Avoid mixing orchestration, rendering, and helper logic in the same file when those concerns start to grow.
