# Editor UI Consistency Contract (Phase 1 Foundation)

This document defines shared naming and styling conventions for image and GIF editor UI.

## Goals

- keep image and GIF flows visually coherent
- reduce one-off styling and duplicated semantics
- enable safe incremental migration without breaking existing classes

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

## Naming guidance

- Prefer **semantic** names (`editor-tool-screen`) over feature-specific carryover names (`preset-sizes-screen`) when used by multiple tools.
- Keep media-specific names only for behavior-specific or rendering-specific concerns.
- Avoid introducing new one-off class names if an `editor-*` class can represent the same purpose.

## Label consistency guidance

For equivalent actions, use consistent wording:

- Primary terminal action: `Export` / `Exporting...` (or explicit variants like `Export GIF`) used consistently.
- Secondary exit action: `Cancel`
- Sub-tool actions: `Apply` + `Cancel`

## Spacing and token guidance

Use CSS custom properties from `src/index.css` (Phase 1 added):

- width/radius/spacing tokens: `--editor-max-width`, `--editor-radius-*`, `--editor-space-*`
- preview height tokens: `--editor-preview-height`, `--editor-preview-height-video`
- status color tokens: `--editor-status-color-*`

## Migration strategy

1. Keep existing selectors in place.
2. Add `editor-*` classes in parallel.
3. Move one feature/screen at a time to `editor-*` classes.
4. Remove legacy aliases only after all usages are migrated.
