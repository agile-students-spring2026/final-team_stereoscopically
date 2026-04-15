# Editor UI Consistency Contract (Phase 1 Foundation)

This document defines shared naming and styling conventions for image and GIF editor UI.

## Goals

- keep image and GIF flows visually coherent
- reduce one-off styling and duplicated semantics
- keep shared naming semantic and stable across tools

## Shared class contract

Use these classes for all editor-focused screens going forward:

- `editor-shell`
  - top-level editor layout container
- `editor-shell-title`
  - top-level editor heading
- `editor-tool-list`
  - stacked tool controls (e.g., Filters, Crop, Resize, Trim)
- `editor-shell-actions`
  - bottom action row (Cancel + Export/Apply)
- `editor-tool-screen`
  - shared wrapper for sub-tool pages
- `editor-tool-screen-actions`
  - semantic action-row class for sub-tool pages
- `editor-tool-cancel`
  - semantic cancel-button class for sub-tool pages
- `editor-actions`
  - shared action-row base for editor and tool controls
- `editor-actions--stack`
  - vertical, full-width button layout (tool lists)
- `editor-actions--inline`
  - horizontal/wrapping action layout (Cancel/Apply/Export rows)
- `editor-slider`
  - shared range slider style for trim, color, and size controls
- `editor-number-input`
  - shared number input style for direct value entry fields
- `editor-range-field`
  - shared vertical label/value+slider grouping for range controls
- `editor-preview`
  - preview area base
- `editor-preview--checkered`
  - checkerboard background when transparent margins/letterboxing should be visible
- `editor-preview--interactive`
  - preview that supports pointer interaction (drag/place/select)
- `editor-preview--video`
  - taller preview variant for video/GIF flows
- `editor-preview--resize`
  - resize-preview variant that uses adaptive height with inner frame/padding
- `editor-preview-media`
  - standardized class for image/video media elements inside preview containers
- `editor-status`
  - base messaging style for info/loading/empty/error text
- `editor-status--error`
  - error variant
- `editor-status--info`
  - informational variant
- `editor-status--loading`
  - loading variant

Use `EditorStatus.jsx` as the default shared renderer for status text in editor-related screens.

Use `EditorToolScreen.jsx` as the default scaffold for tool pages. Prefer passing:

- `title` and optional `subtitle` for header text
- `preview` for media preview content
- `controls` for tool-specific form/buttons
- `actions` for custom button rows, or `hideActions` when no footer actions are needed

## Naming guidance

- Prefer **semantic** names (`editor-tool-screen`) over feature-specific carryover names (`preset-sizes-screen`) when used by multiple tools.
- Keep media-specific names only for behavior-specific or rendering-specific concerns.
- Avoid introducing new one-off class names if an `editor-*` class can represent the same purpose.

## Label consistency guidance

For equivalent actions, use consistent wording:

- Primary terminal action: `Export` / `Exporting...` (or explicit variants like `Export GIF`) used consistently.
- Secondary exit action: `Cancel`
- Sub-tool actions: `Apply` + `Cancel`

## Text tool consistency guidance

For image and GIF text overlays, keep these controls in the same order when possible:

1. placement hint
2. text content
3. color
4. size (number + slider)

If a media type lacks a field (for example, font family), keep the remaining order stable.

For placement math (frame fitting, clamping, fallback sizing), reuse `src/utils/overlayPlacement.js` instead of duplicating helpers in individual text editor components.

For GIF/video preview source handling (File object URLs vs persisted backend URLs), reuse `src/hooks/useVideoPreviewUrl.js` rather than repeating URL resolution and revoke logic in each component.

## Spacing and token guidance

Use CSS custom properties from `src/index.css` (Phase 1 added):

- width/radius/spacing tokens: `--editor-max-width`, `--editor-radius-*`, `--editor-space-*`
- preview height tokens: `--editor-preview-height`, `--editor-preview-height-video`
- status color tokens: `--editor-status-color-*`

## Migration strategy

Legacy `preset-sizes-*` aliases have been fully migrated to semantic `editor-*` classes.
Going forward, add and use only the `editor-*` contract for shared editor UI patterns.
