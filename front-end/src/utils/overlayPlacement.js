export const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export const asNumberOrFallback = (value, fallback) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

export const getContainedContentFrame = ({
  frameLeft,
  frameTop,
  frameWidth,
  frameHeight,
  naturalWidth,
  naturalHeight,
}) => {
  const safeFrameWidth = Math.max(1, frameWidth || 1)
  const safeFrameHeight = Math.max(1, frameHeight || 1)
  const safeNaturalWidth = Math.max(1, naturalWidth || 1)
  const safeNaturalHeight = Math.max(1, naturalHeight || 1)

  const scale = Math.min(safeFrameWidth / safeNaturalWidth, safeFrameHeight / safeNaturalHeight)
  const width = safeNaturalWidth * scale
  const height = safeNaturalHeight * scale

  return {
    left: frameLeft + (safeFrameWidth - width) / 2,
    top: frameTop + (safeFrameHeight - height) / 2,
    width,
    height,
  }
}

export const getSafeFrame = (frame, containerSize) => {
  const fallbackWidth = Math.max(1, containerSize.width || 1)
  const fallbackHeight = Math.max(1, containerSize.height || 1)

  return {
    left: Number.isFinite(frame?.left) ? frame.left : 0,
    top: Number.isFinite(frame?.top) ? frame.top : 0,
    width: Number.isFinite(frame?.width) && frame.width > 0 ? frame.width : fallbackWidth,
    height: Number.isFinite(frame?.height) && frame.height > 0 ? frame.height : fallbackHeight,
  }
}
