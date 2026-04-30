import { useCallback, useEffect, useRef, useState } from 'react'
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
    draftTitleInput = '',
    onDraftTitleInputChange,
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

    const videoRef = useRef(null)

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
                    <div className={`gif-preview-frame ${previewFrameClassName}`} style={{ backgroundColor: resizeBorderColor }}>
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
                                        fontSize: `${previewTextSize}px`,
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

            <div className="editor-draft-title-row">
                <label className="editor-draft-title-label" htmlFor="gif-draft-title">
                    Draft name
                </label>
                <input
                    id="gif-draft-title"
                    type="text"
                    className="editor-draft-title-input"
                    maxLength={200}
                    value={draftTitleInput}
                    onChange={(e) => onDraftTitleInputChange?.(e.target.value)}
                    disabled={isProcessing || isSavingDraft}
                    placeholder="Name this draft"
                    autoComplete="off"
                />
            </div>

            <div className="card editor-actions editor-actions--stack">
                <button type="button" className="btn-primary" onClick={onOpenTrim}>
                    Trim
                </button>
                <button type="button" className="btn-primary" onClick={onOpenResize}>
                    Resize
                </button>
                <button type="button" className="btn-primary" onClick={onOpenFilters}>
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
