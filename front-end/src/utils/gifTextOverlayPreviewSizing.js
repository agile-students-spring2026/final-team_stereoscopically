import { clamp } from './overlayPlacement'
import {
  DEFAULT_GIF_RESIZE_PRESET,
  GIF_RESIZE_PRESET_DIMENSIONS,
} from '../components/gif/gifEditorConstants'

/**
 * Uniform scale FFmpeg uses after `scale=tw:th:force_original_aspect_ratio=decrease` (matches gifMediaService).
 */
export function gifExportUniformScale(nw, nh, presetKey) {
  const dims =
    GIF_RESIZE_PRESET_DIMENSIONS[presetKey] ??
    GIF_RESIZE_PRESET_DIMENSIONS[DEFAULT_GIF_RESIZE_PRESET]
  const tw = dims.width
  const th = dims.height
  const iw = Math.max(1, nw)
  const ih = Math.max(1, nh)
  const uniform = Math.min(tw / iw, th / ih)
  return { tw, th, uniform, contentExportW: iw * uniform, contentExportH: ih * uniform }
}

/**
 * CSS font-size (px) for overlay on the *contained* video rect in the preview, so it matches
 * drawtext fontsize on the exported GIF (same ratio to scaled video content as backend).
 */
export function gifTextPreviewOverlayFontCssPx({
  sourceWidth,
  sourceHeight,
  resizePreset,
  uiTextSize,
  contentRectWidthPx,
}) {
  const nw = Math.max(1, sourceWidth)
  const nh = Math.max(1, sourceHeight)
  const { uniform, contentExportW } = gifExportUniformScale(nw, nh, resizePreset)
  const exportDrawtextFontPx = Math.round(uiTextSize * uniform)
  const wPrev = Math.max(1, contentRectWidthPx)
  const wExp = Math.max(1, contentExportW)
  return clamp(exportDrawtextFontPx * (wPrev / wExp), 4, 420)
}
