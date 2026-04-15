# Editor Cleanup PR1 Contract

This document records the architecture and consistency decisions established in PR1 so later cleanup PRs can build on a fixed baseline.

## Scope captured in PR1

PR1 is intentionally **non-behavioral** and focuses on shared contracts plus duplication cleanup.

Included:

- shared preset filter options extracted to one module
- shared GIF editor constants extracted to one module
- duplicated download trigger logic aligned to shared `downloadFile` utility
- no flow restructuring and no interaction model changes

## Shared vs media-specific boundaries

### Shared (standardize)

- preset filter option definitions (`default`, `noir`, `sepia`, `vivid`, `fade`)
- GIF resize and text default constants used in multiple GIF files
- shared download trigger behavior for final asset export

### Media-specific (remain separate)

- image-only tools: crop, color filters
- GIF-only tools: trim, speed
- media-specific backend request payloads and endpoint workflows

## Contract decisions

1. **Single source of truth for shared options/constants**
   - shared options and defaults must be imported, not redefined per component/hook
2. **No UX changes in PR1**
   - text/filters/resize flow behavior stays unchanged during dedupe
3. **Shared utility for file download trigger**
   - editors should use `src/utils/downloadFile.js` for anchor download behavior

## Follow-up expectations for PR2+

- move image filter request orchestration out of components and into hooks
- standardize preview/apply request lifecycle handling across image and GIF
- standardize sub-tool navigation and action ordering where tools overlap
