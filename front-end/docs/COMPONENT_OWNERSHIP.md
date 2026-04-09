# Front-end Component Ownership (Current State + Direction)

This document is the **single source of truth** for component ownership in this project.

Scope for this version:
- Component ownership rules
- What currently lives in `src/components`
- What should stay, what should be reduced, and what can be refactored later

Deferred for later docs:
- `hooks` ownership details
- `services` ownership details
- `utils` ownership details

---

## What components should own

Components in `src/components` should own:
- Rendering UI and layout
- Local UI state (button selection, form input values, temporary toggles)
- Local interaction behavior tied to visuals (drag/resize, pointer handling)
- Emitting user intent to parent via callbacks (`onApply`, `onCancel`, `onSelect`, etc.)

## What components should avoid

Components should avoid:
- Becoming cross-screen orchestrators unless they are explicitly a container
- Duplicating validation logic that already exists upstream
- Embedding large non-UI helper logic that can be extracted
- Owning too many unrelated responsibilities in a single file

---

## Current `src/components` inventory and purpose

| File | Purpose right now | Keep / Change |
|---|---|---|
| `EditorContainer.jsx` | Main editor flow container; coordinates screens and wires media actions through the UI. | **Keep**, but continue shrinking non-UI helper logic over time. |
| `CreateNew.jsx` | Entry card for upload image/video and opening camera; shows selection/validation status. | **Keep as-is**. Clear single purpose. |
| `ImageEditor.jsx` | Image editing screen with reframe flow, image preview, and crop apply interactions. | **Keep**, but reduce mixed responsibilities as refactors continue. |
| `ImageCropper.jsx` | Crop box UI + pointer interactions + crop area updates. | **Keep as-is**. Strong ownership boundary. |
| `GifEditor.jsx` | Video-to-GIF editing/conversion screen with trim controls and processing status. | **Keep**, watch for duplicated validation logic. |
| `CameraCapture.jsx` | Camera stream, capture photo, and video recording interaction lifecycle. | **Keep as-is**. Correct place for camera behavior. |
| `PhotoPreview.jsx` | Confirm/retake/cancel preview screen for captured media. | **Keep as-is**. |
| `FilterMain.jsx` | Filter category hub (Preset Filters, Add Text, Color Filters). | **Keep as-is**. |
| `FilterScreen.jsx` | Shared frame shell for filter pages (title, preview, apply/cancel actions). | **Keep as-is**. Good shared wrapper. |
| `PresetFilters.jsx` | Preset style selector with apply payload. | **Keep as-is**. |
| `ColorFilters.jsx` | Slider controls for color adjustments + apply payload. | **Keep as-is**. |
| `AddText.jsx` | Text/font/size/position controls + apply payload. | **Keep as-is**. |
| `PresetSizes.jsx` | Output size presets + letterbox color options + selection callback. | **Keep as-is**. |
| `videoSupport.js` | Browser video MIME support helper. | **Defer move** (agreed): currently here, can be relocated later. |

---

## Should files be combined or removed now?

### Recommended now
- **Do not remove files right now.**
- Keep current screen-level separation.
- Prioritize extracting heavy logic from `EditorContainer.jsx` before combining UI files.

### Keep separate
- `ImageCropper.jsx` and `ImageEditor.jsx` should remain separate.
- `FilterScreen.jsx` should remain the shared shell for filter screens.
- `CreateNew.jsx`, `CameraCapture.jsx`, and `PhotoPreview.jsx` should remain distinct stages.

### Optional future simplifications (not required now)
- Data-drive filter options (e.g., config arrays) if button duplication grows.
- Add small reusable form-control pieces only if repeated patterns become hard to maintain.

---

## Practical PR guardrails (component-focused)

Before adding logic to a component, ask:

1. Is this logic directly tied to this component’s visual behavior?
   - If yes, keep it in the component.
2. Is this logic reused by multiple components/screens?
   - If yes, plan extraction (later docs will define exact target).
3. Is this making the component hard to read (large branching/helper blocks)?
   - If yes, split helpers or subcomponents.
4. Can this component still be explained in 2–3 sentences?
   - If no, responsibility is likely too broad.