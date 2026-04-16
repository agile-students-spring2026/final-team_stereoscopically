import { useCallback, useRef, useState } from 'react'
import { trimVideoService, applyVideoFilter, exportGifToBackend } from '../services/backendGifService'
import { GIF_SPEED_PLAYBACK_RATES, DEFAULT_GIF_SPEED_PLAYBACK_RATE } from '../components/gif/gifSpeedOptions'
import {
  createInitialGifTextSettings,
  GIF_FLOW_TOOLS,
  sanitizeGifTextSettings,
} from '../components/gif/gifFlowState'
import { downloadFile } from '../utils/downloadFile'

/**
 * Normalize a committed trim range against a concrete video duration.
 * Ensures start/end are within [0, duration] and end >= start.
 */
export const resolveGifTrimRange = (trimRange, totalDuration) => {
  const safeDuration = Number.isFinite(totalDuration) && totalDuration > 0 ? totalDuration : 0
  const rawStart = Number(trimRange?.start)
  const rawEnd = Number(trimRange?.end)

  const safeStart = Math.min(Math.max(Number.isFinite(rawStart) ? rawStart : 0, 0), safeDuration)
  const candidateEnd = Number.isFinite(rawEnd) && rawEnd > 0 ? rawEnd : safeDuration
  const safeEnd = Math.min(Math.max(candidateEnd, safeStart), safeDuration)

  return { start: safeStart, end: safeEnd }
}

const DEFAULT_GIF_TEXT_SETTINGS = createInitialGifTextSettings()

const DEFAULT_GIF_RESIZE_PRESET = 'square'
const DEFAULT_GIF_RESIZE_BORDER_COLOR = '#000000'
const VALID_GIF_RESIZE_PRESETS = new Set(['square', 'landscape', 'portrait'])
const GIF_BORDER_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/

/**
 * useGifEditingSession
 *
 * Orchestrates GIF editing workflow state across trim, resize, speed, filters, and export.
 *
 * Responsible for:
 * - Maintaining GIF session state (trim range, resize preset, border color, speed, active tool)
 * - Exposing actions for GIF workflow transitions (trim, resize, speed, filters, export)
 * - Delegating backend requests to services
 * - Preserving session continuity across repeated edits
 * - Handling reset and cancel behavior
 *
 * Not responsible for:
 * - UI rendering
 * - Backend transport details
 * - Screen-level interaction behavior
 */
const useGifEditingSession = () => {
  // Trim state
  const [trimRange, setTrimRange] = useState({ start: 0, end: 0 })

  // Resize state
  const [resizePreset, setResizePreset] = useState(DEFAULT_GIF_RESIZE_PRESET)
  const [resizeBorderColor, setResizeBorderColor] = useState(DEFAULT_GIF_RESIZE_BORDER_COLOR)

  // Speed state
  const [selectedSpeedPlaybackRate, setSelectedSpeedPlaybackRate] = useState(DEFAULT_GIF_SPEED_PLAYBACK_RATE)

  // Text overlay state
  const [textOverlaySettings, setTextOverlaySettings] = useState(DEFAULT_GIF_TEXT_SETTINGS)

  // Tool navigation state
  const [activeTool, setActiveTool] = useState(GIF_FLOW_TOOLS.EDITOR)

  // Filter selection state (for video preset filters)
  const [selectedFilterPreset, setSelectedFilterPreset] = useState('default')

  // Filter preview state
  const [filterPreviewUrl, setFilterPreviewUrl] = useState(null)
  const [filterPreviewResult, setFilterPreviewResult] = useState(null)
  const [isLoadingFilterPreview, setIsLoadingFilterPreview] = useState(false)
  const [filterPreviewError, setFilterPreviewError] = useState(null)

  const previewRequestIdRef = useRef(0)

  // Export/conversion state
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)
  const [exportError, setExportError] = useState(null)

  /**
   * Navigate to a different GIF editing tool
   */
  const openGifTool = useCallback((nextTool) => {
    setActiveTool(nextTool)
  }, [])

  /**
   * Apply trim selection and return to editor
   */
  const applyTrimRange = useCallback((nextRange) => {
    const safeStart = Math.max(0, Number(nextRange?.start) || 0)
    const rawEnd = Number(nextRange?.end)
    const safeEnd = Number.isFinite(rawEnd) ? Math.max(safeStart, rawEnd) : safeStart

    setTrimRange({ start: safeStart, end: safeEnd })
    setActiveTool(GIF_FLOW_TOOLS.EDITOR)
  }, [])

  /**
   * Apply resize settings and return to editor
   */
  const applyResizeSettings = useCallback((nextResizeSettings) => {
    const rawPreset = typeof nextResizeSettings === 'string'
      ? nextResizeSettings
      : nextResizeSettings?.preset
    const rawBorderColor = typeof nextResizeSettings === 'string'
      ? DEFAULT_GIF_RESIZE_BORDER_COLOR
      : nextResizeSettings?.borderColor

    const safePreset = VALID_GIF_RESIZE_PRESETS.has(rawPreset)
      ? rawPreset
      : DEFAULT_GIF_RESIZE_PRESET
    const safeBorderColor =
      typeof rawBorderColor === 'string' && GIF_BORDER_COLOR_REGEX.test(rawBorderColor)
        ? rawBorderColor
        : DEFAULT_GIF_RESIZE_BORDER_COLOR

    setResizePreset(safePreset)
    setResizeBorderColor(safeBorderColor)
    setActiveTool(GIF_FLOW_TOOLS.EDITOR)
  }, [])

  /**
   * Select a speed option
   */
  const selectSpeed = useCallback((nextSpeedPlaybackRate) => {
    if (!GIF_SPEED_PLAYBACK_RATES.includes(nextSpeedPlaybackRate)) {
      setSelectedSpeedPlaybackRate(DEFAULT_GIF_SPEED_PLAYBACK_RATE)
      return
    }
    setSelectedSpeedPlaybackRate(nextSpeedPlaybackRate)
  }, [])

  /**
   * Apply speed selection and return to editor
   */
  const applySpeed = useCallback(() => {
    setActiveTool(GIF_FLOW_TOOLS.EDITOR)
  }, [])

  /**
   * Set GIF text overlay settings as a full object.
   */
  const setGifTextOverlaySettings = useCallback((nextSettings) => {
    setTextOverlaySettings(sanitizeGifTextSettings(nextSettings))
  }, [])

  /**
   * Update GIF text overlay settings with partial values.
   */
  const updateGifTextOverlaySettings = useCallback((partialSettings) => {
    setTextOverlaySettings((current) => sanitizeGifTextSettings({
      ...current,
      ...partialSettings,
      position: {
        ...current.position,
        ...(partialSettings?.position || {}),
      },
    }))
  }, [])

  /**
   * Apply text overlay settings and return to editor.
   */
  const applyGifTextOverlaySettings = useCallback((nextSettings) => {
    setTextOverlaySettings(sanitizeGifTextSettings(nextSettings))
    setActiveTool(GIF_FLOW_TOOLS.EDITOR)
  }, [])

  /**
   * Reset text overlay settings to defaults.
   */
  const resetGifTextOverlaySettings = useCallback(() => {
    setTextOverlaySettings(createInitialGifTextSettings())
  }, [])

  /**
   * Load a filter preview for a given preset
   */
  const loadFilterPreview = useCallback(async (videoFile, preset) => {
    setFilterPreviewError(null)
    const requestId = ++previewRequestIdRef.current

    if (!videoFile || preset === 'default') {
      setFilterPreviewUrl(null)
      setFilterPreviewResult(null)
      return null
    }

    try {
      setIsLoadingFilterPreview(true)
      const result = await applyVideoFilter(videoFile, preset)

      if (requestId !== previewRequestIdRef.current) {
        // A newer request has been started; ignore this result
        return null
      }

      setFilterPreviewUrl(result?.url || null)
      setFilterPreviewResult(result || null)
      return result
    } catch (err) {
      if (requestId !== previewRequestIdRef.current) {
        // Swallow errors from stale requests
        return null
      }

      setFilterPreviewError(err?.message || 'Preview failed.')
      setFilterPreviewResult(null)
      setFilterPreviewUrl(null)
      throw err
    } finally {
      if (requestId === previewRequestIdRef.current) {
        setIsLoadingFilterPreview(false)
      }
    }
  }, [])

  /**
   * Select a filter preset for video and trigger preview loading
   */
  const selectFilterPreset = useCallback(
    async (videoFile, preset) => {
      const nextPreset = preset || 'default'
      setSelectedFilterPreset(nextPreset)

      if (!videoFile) {
        return null
      }

      return loadFilterPreview(videoFile, nextPreset)
    },
    [loadFilterPreview]
  )

  /**
   * Apply a video filter and return to editor
   * If no result is provided, uses the cached preview result
   */
  const applyVideoFilterAndReturn = useCallback(async (videoFile, preset, optionalResult) => {
    try {
      setIsProcessing(true)
      setExportError(null)

      let result = optionalResult

      if (!result) {
        if (preset === 'default') {
          result = null
        } else if (!videoFile) {
          throw new Error('Video file not ready for filter application.')
        } else {
          result = await applyVideoFilter(videoFile, preset)
        }
      }

      setActiveTool(GIF_FLOW_TOOLS.EDITOR)
      return result
    } catch (err) {
      setExportError(err?.message || 'Could not apply preset.')
      throw err
    } finally {
      setIsProcessing(false)
    }
  }, [])

  /**
   * Create GIF from video (trim) and export
   * Orchestrates the sequence: trim → export → download
   */
  const createAndExportGif = useCallback(
    async (videoFile, overrideTrimRange) => {
      if (!videoFile) {
        setExportError('Video file not ready for conversion.')
        return null
      }

      setIsProcessing(true)
      setStatusMessage('Preparing GIF download…')
      setExportError(null)

      try {
        const effectiveTrimStart = Number.isFinite(overrideTrimRange?.trimStart)
          ? overrideTrimRange.trimStart
          : trimRange.start
        const effectiveTrimEnd = Number.isFinite(overrideTrimRange?.trimEnd)
          ? overrideTrimRange.trimEnd
          : trimRange.end

        if (
          !Number.isFinite(effectiveTrimStart) ||
          !Number.isFinite(effectiveTrimEnd) ||
          effectiveTrimStart < 0 ||
          effectiveTrimEnd <= effectiveTrimStart
        ) {
          throw new Error('GIF trim range is invalid. Please adjust trim and try again.')
        }

        // Step 1: Trim the video
        const trimmed = await trimVideoService(
          videoFile,
          effectiveTrimStart,
          effectiveTrimEnd,
          resizePreset,
          resizeBorderColor,
          textOverlaySettings
        )

        if (!trimmed?.id) {
          throw new Error('GIF conversion did not return a downloadable result.')
        }

        // Step 2: Export with selected speed
        const exported = await exportGifToBackend(trimmed.id, selectedSpeedPlaybackRate)

        if (!exported?.downloadUrl) {
          throw new Error('GIF export did not return a download URL.')
        }

        // Step 3: Trigger download
        downloadFile(exported.downloadUrl, 'output.gif')

        setStatusMessage(null)
        return exported
      } catch (err) {
        setExportError(err?.message || 'GIF conversion failed. Please try again.')
        setStatusMessage(null)
        throw err
      } finally {
        setIsProcessing(false)
      }
    },
    [trimRange, resizePreset, resizeBorderColor, selectedSpeedPlaybackRate, textOverlaySettings]
  )

  /**
   * Reset the GIF editing session to initial state
   * Optionally preserve the selected speed across video uploads
   */
  const resetGifSession = useCallback((options = {}) => {
    const { preserveSelectedSpeed = false } = options

    setActiveTool(GIF_FLOW_TOOLS.EDITOR)
    setTrimRange({ start: 0, end: 0 })
    setResizePreset(DEFAULT_GIF_RESIZE_PRESET)
    setResizeBorderColor(DEFAULT_GIF_RESIZE_BORDER_COLOR)
    setIsProcessing(false)
    setStatusMessage(null)
    setExportError(null)
    setFilterPreviewUrl(null)
    setFilterPreviewResult(null)
    setIsLoadingFilterPreview(false)
    setFilterPreviewError(null)
    setSelectedFilterPreset('default')
    setTextOverlaySettings(createInitialGifTextSettings())

    if (!preserveSelectedSpeed) {
      setSelectedSpeedPlaybackRate(DEFAULT_GIF_SPEED_PLAYBACK_RATE)
    }
  }, [])

  return {
    // Trim state and actions
    trimRange,
    applyTrimRange,

    // Resize state and actions
    resizePreset,
    resizeBorderColor,
    applyResizeSettings,

    // Speed state and actions
    selectedSpeedPlaybackRate,
    selectSpeed,
    applySpeed,

    // Text state and actions
    textOverlaySettings,
    setGifTextOverlaySettings,
    updateGifTextOverlaySettings,
    applyGifTextOverlaySettings,
    resetGifTextOverlaySettings,

    // Tool navigation
    activeTool,
    openGifTool,
    GIF_FLOW_TOOLS,

    // Filter selection state/actions
    selectedFilterPreset,
    selectFilterPreset,

    // Filter preview state and actions
    filterPreviewUrl,
    filterPreviewResult,
    isLoadingFilterPreview,
    filterPreviewError,
    loadFilterPreview,
    applyVideoFilterAndReturn,

    // Processing state
    isProcessing,
    statusMessage,
    exportError,
    createAndExportGif,

    // Reset
    resetGifSession,
  }
}

export default useGifEditingSession
