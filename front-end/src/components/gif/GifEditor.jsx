import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    getContainedContentFrame,
    getSafeFrame,
} from '../../utils/overlayPlacement'
import { DEFAULT_GIF_SPEED_PLAYBACK_RATE } from './gifSpeedOptions'
import { resolveGifTrimRange } from '../../hooks/useGifEditingSession'
import EditorStatus from '../EditorStatus'
import useVideoPreviewUrl from '../../hooks/useVideoPreviewUrl'
import {
    DEFAULT_GIF_RESIZE_BORDER_COLOR,
    DEFAULT_GIF_RESIZE_PRESET,
    DEFAULT_GIF_TEXT_OVERLAY_SETTINGS,
    GIF_RESIZE_PRESET_FRAME_CLASSES,
    GIF_TEXT_COLOR_REGEX,
} from './gifEditorConstants'
import { gifTextPreviewOverlayFontCssPx } from '../../utils/gifTextOverlayPreviewSizing'
const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const GifEditor = ({
    videoFile,
    gifSessionState,
    onCancel,
    onCreateGif,
    onOpenTrim,
    onOpenResize,
    onOpenFilters,
    onSaveForLater,
    isSavingDraft = false,
    saveDraftError = null,
    saveDraftMessage = null,
}) => {
    const {
        trimRange = { start: 0, end: 0 },
        resizePreset = DEFAULT_GIF_RESIZE_PRESET,
        resizeBorderColor = DEFAULT_GIF_RESIZE_BORDER_COLOR,
        selectedSpeedPlaybackRate = DEFAULT_GIF_SPEED_PLAYBACK_RATE,
        textOverlaySettings = DEFAULT_GIF_TEXT_OVERLAY_SETTINGS,
    } = gifSessionState || {}

    const previewText = typeof textOverlaySettings?.text === 'string'
        ? textOverlaySettings.text
        : DEFAULT_GIF_TEXT_OVERLAY_SETTINGS.text
    const previewTextSize = clamp(
        Number(textOverlaySettings?.size) || DEFAULT_GIF_TEXT_OVERLAY_SETTINGS.size,
        8,
        120,
    )
    const previewTextColor =
        typeof textOverlaySettings?.color === 'string' && GIF_TEXT_COLOR_REGEX.test(textOverlaySettings.color)
            ? textOverlaySettings.color
            : DEFAULT_GIF_TEXT_OVERLAY_SETTINGS.color
    const previewTextFontFamily =
        typeof textOverlaySettings?.fontFamily === 'string' && textOverlaySettings.fontFamily.trim()
            ? textOverlaySettings.fontFamily.trim()
            : DEFAULT_GIF_TEXT_OVERLAY_SETTINGS.fontFamily
    const previewTextPositionX = clamp(
        Number(textOverlaySettings?.position?.x) || DEFAULT_GIF_TEXT_OVERLAY_SETTINGS.position.x,
        0,
        100,
    )
    const previewTextPositionY = clamp(
        Number(textOverlaySettings?.position?.y) || DEFAULT_GIF_TEXT_OVERLAY_SETTINGS.position.y,
        0,
        100,
    )

    const previewFrameClassName = GIF_RESIZE_PRESET_FRAME_CLASSES[resizePreset] || GIF_RESIZE_PRESET_FRAME_CLASSES[DEFAULT_GIF_RESIZE_PRESET]

    const [isProcessing, setIsProcessing] = useState(false)
    const [statusMessage, setStatusMessage] = useState(null)
    const [conversionError, setConversionError] = useState(null)

    const [duration, setDuration] = useState(0)
    const [trimStart, setTrimStart] = useState(0)
    const [trimEnd, setTrimEnd] = useState(0)
    const [previewContainerSize, setPreviewContainerSize] = useState({ width: 1, height: 1 })
    const [videoFrame, setVideoFrame] = useState({ left: 0, top: 0, width: 1, height: 1 })
    const [naturalVideoSize, setNaturalVideoSize] = useState({ width: 1, height: 1 })

    const videoRef = useRef(null)
    const previewFrameRef = useRef(null)

    const handlePreviewUrlError = useCallback((error) => {
        console.error('[GifEditor] Unable to create preview for uploaded video', error)
    }, [])

    const videoUrl = useVideoPreviewUrl(videoFile, { onObjectUrlError: handlePreviewUrlError })

    useEffect(() => {
        queueMicrotask(() => {
            setStatusMessage(null)
            setConversionError(null)
            setDuration(0)
            setTrimStart(0)
            setTrimEnd(0)
        })

        if (videoRef.current) {
            videoRef.current.pause()
            videoRef.current.currentTime = 0
        }
    }, [videoFile])

    useEffect(() => {
        const video = videoRef.current
        if (!video) return
        video.playbackRate = selectedSpeedPlaybackRate
    }, [selectedSpeedPlaybackRate])

    /** Match GifTextOverlayEditor + backend: `size` is px on natural video frame, preview scales to letterboxed display. */
    useEffect(() => {
        const container = previewFrameRef.current
        const video = videoRef.current
        if (!container || !videoUrl) return undefined

        const syncFrame = () => {
            setPreviewContainerSize({
                width: container.clientWidth || 1,
                height: container.clientHeight || 1,
            })

            if (!video.clientWidth || !video.clientHeight) {
                setNaturalVideoSize({ width: 1, height: 1 })
                setVideoFrame({
                    left: 0,
                    top: 0,
                    width: container.clientWidth || 1,
                    height: container.clientHeight || 1,
                })
                return
            }

            const naturalWidth = Math.max(1, video.videoWidth || 1)
            const naturalHeight = Math.max(1, video.videoHeight || 1)

            setNaturalVideoSize({ width: naturalWidth, height: naturalHeight })

            const containerRect = container.getBoundingClientRect()
            const videoRect = video.getBoundingClientRect()

            const containedFrame = getContainedContentFrame({
                frameLeft: videoRect.left - containerRect.left,
                frameTop: videoRect.top - containerRect.top,
                frameWidth: videoRect.width,
                frameHeight: videoRect.height,
                naturalWidth,
                naturalHeight,
            })

            setVideoFrame(containedFrame)
        }

        const rafId = requestAnimationFrame(syncFrame)

        window.addEventListener('resize', syncFrame)
        let observer
        if (typeof ResizeObserver !== 'undefined') {
            observer = new ResizeObserver(syncFrame)
            observer.observe(container)
            observer.observe(video)
        }

        video.addEventListener('loadedmetadata', syncFrame)

        return () => {
            cancelAnimationFrame(rafId)
            window.removeEventListener('resize', syncFrame)
            observer?.disconnect()
            video.removeEventListener('loadedmetadata', syncFrame)
        }
    }, [videoUrl, resizePreset, resizeBorderColor])

    const renderedVideoBox = getSafeFrame(videoFrame, previewContainerSize)
    const previewOverlayFontPx = useMemo(
        () =>
            gifTextPreviewOverlayFontCssPx({
                sourceWidth: naturalVideoSize.width,
                sourceHeight: naturalVideoSize.height,
                resizePreset,
                uiTextSize: previewTextSize,
                contentRectWidthPx: renderedVideoBox.width,
            }),
        [
            naturalVideoSize.height,
            naturalVideoSize.width,
            previewTextSize,
            renderedVideoBox.width,
            resizePreset,
        ],
    )

    const resetTransientEditorState = useCallback(() => {
        setStatusMessage(null)
        setConversionError(null)

        if (videoRef.current) {
            videoRef.current.pause()
            videoRef.current.currentTime = 0
        }
    }, [])
    
    const handleConvertToGif = async () => {
        if (isProcessing) return
        if (!videoFile || !videoUrl) {
            setConversionError('Video is not ready for conversion. Please re-upload and try again.')
            return
        }

        if (duration <= 0 || trimEnd <= trimStart) {
            setConversionError('Trim range is not ready yet. Please wait for the video to load.')
            return
        }

        setIsProcessing(true)
        setConversionError(null)
        setStatusMessage('Preparing GIF download…')

        try {
            if (!onCreateGif) throw new Error('GIF conversion is not available right now.')
            await onCreateGif(videoFile, { trimStart, trimEnd })
            setStatusMessage(null)
        } catch (error) {
            setConversionError(error?.message || 'GIF conversion failed. Please try again.')
            setStatusMessage(null)
        } finally {
            setIsProcessing(false)
        }
    }
    return (
        <div className="video-editor-container">
            <h2 className="editor-shell-title">GIF Editor</h2>

            <div className="editor-preview editor-preview--resize editor-preview--checkered">
                {videoUrl ? (
                    <div ref={previewFrameRef} className={`gif-preview-frame ${previewFrameClassName}`} style={{ backgroundColor: resizeBorderColor }}>
                        <video ref={videoRef} src={videoUrl} controls className="editor-preview-media gif-preview-video"
                            onLoadedMetadata={() => {
                                const total = Number.isFinite(videoRef.current?.duration)
                                        ? videoRef.current.duration
                                        : 0
                                const nextTrim = resolveGifTrimRange(trimRange, total)
                                setDuration(total)
                                setTrimStart(nextTrim.start)
                                setTrimEnd(nextTrim.end)
                                if (videoRef.current) {
                                    videoRef.current.currentTime = nextTrim.start
                                    videoRef.current.playbackRate = selectedSpeedPlaybackRate
                                }
                            }}
                            onTimeUpdate={() => {
                                if (trimEnd > 0 && videoRef.current && videoRef.current.currentTime >= trimEnd) {
                                    videoRef.current.pause()
                                    videoRef.current.currentTime = trimStart
                                }
                            }}
                        />
                        {previewText.trim() ? (
                            <div className="gif-text-overlay-preview" aria-hidden="true">
                                <span
                                    className="gif-text-overlay-preview-content"
                                    style={{
                                        left: `${previewTextPositionX}%`,
                                        top: `${previewTextPositionY}%`,
                                        color: previewTextColor,
                                        fontSize: `${previewOverlayFontPx}px`,
                                        fontFamily: previewTextFontFamily,
                                    }}
                                >
                                    {previewText}
                                </span>
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <EditorStatus centered>Upload a video to start editing.</EditorStatus>
                )}
            </div>

            <div className="card editor-actions editor-actions--stack">
                <button
                    type="button"
                    className="btn-primary"
                    onClick={onOpenTrim}
                    disabled={isProcessing || isSavingDraft}
                >
                    Trim
                </button>
                <button
                    type="button"
                    className="btn-primary"
                    onClick={onOpenResize}
                    disabled={isProcessing || isSavingDraft}
                >
                    Resize
                </button>
                <button
                    type="button"
                    className="btn-primary"
                    onClick={onOpenFilters}
                    disabled={isProcessing || isSavingDraft}
                >
                    Filters
                </button>
            </div>

            <div className="editor-actions editor-actions--spaced editor-actions--inline editor-actions--wrap">
                <button type="button" className="btn-secondary" onClick={() => {
                    resetTransientEditorState()
                    onCancel?.()
                }}>
                    Cancel
                </button>
                <button
                    type="button"
                    className="btn-secondary"
                    onClick={onSaveForLater}
                    disabled={isProcessing || isSavingDraft || !videoUrl || duration <= 0}
                >
                    {isSavingDraft ? 'Saving…' : 'Save for later'}
                </button>
                <button
                    type="button"
                    className="btn-primary"
                    onClick={handleConvertToGif}
                    disabled={isProcessing || isSavingDraft || !videoUrl || duration <= 0}
                >
                    {isProcessing ? 'Exporting...' : 'Export GIF'}
                </button>
            </div>

            {saveDraftError && (
                <EditorStatus tone="error" spaced>
                    {saveDraftError}
                </EditorStatus>
            )}
            {saveDraftMessage && !saveDraftError && (
                <EditorStatus tone="info" spaced>
                    {saveDraftMessage}
                </EditorStatus>
            )}

            {statusMessage && (
                <EditorStatus tone="info" spaced>
                    {statusMessage}
                </EditorStatus>
            )}

            {conversionError && (
                <EditorStatus tone="error" spaced>
                    {conversionError}
                </EditorStatus>
            )}
        </div>
    )
}

export default GifEditor
