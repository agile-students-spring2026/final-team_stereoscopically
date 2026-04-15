import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_GIF_SPEED_PLAYBACK_RATE } from './gifSpeedOptions'
import { resolveGifTrimRange } from '../../hooks/useGifEditingSession'
import EditorStatus from '../EditorStatus'

const DEFAULT_GIF_RESIZE_PRESET = 'square'
const DEFAULT_GIF_TEXT_OVERLAY_SETTINGS = {
    text: '',
    size: 32,
    color: '#FFFFFF',
    position: { x: 50, y: 50 },
}
const GIF_TEXT_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/
const GIF_RESIZE_PRESET_FRAME_CLASSES = {
    square: 'gif-preview-frame--square',
    landscape: 'gif-preview-frame--landscape',
    portrait: 'gif-preview-frame--portrait',
}
const DEFAULT_GIF_RESIZE_BORDER_COLOR = '#000000'
const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const GifEditor = ({
    videoFile,
    gifSessionState,
    onCancel,
    onCreateGif,
    onOpenTrim,
    onOpenResize,
    onOpenFilters,
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

    const resolveVideoUrl = (mediaValue) => {
        if (!mediaValue) return null
        if (typeof mediaValue === 'string') return mediaValue
        if (typeof mediaValue === 'object') {
            return mediaValue.url || mediaValue.src || mediaValue.source || mediaValue.fullUrl || null
        }
        return null
    }

    const videoUrl = useMemo(() => {
        if (!videoFile) return null
        if (videoFile instanceof File) {
            try {
                return URL.createObjectURL(videoFile)
            } catch (error) {
                console.error('[GifEditor] Unable to create preview for uploaded video', error)
                return null
            }
        }
        return resolveVideoUrl(videoFile)
    }, [videoFile])

    useEffect(() => {
        if (!(videoFile instanceof File) || !videoUrl) return
        return () => {
            if (import.meta.env.PROD) {
                URL.revokeObjectURL(videoUrl)
            }
        }
    }, [videoFile, videoUrl])

    useEffect(() => {
        setStatusMessage(null)
        setConversionError(null)
        setDuration(0)
        setTrimStart(0)
        setTrimEnd(0)

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
    // No longer need to check support here; handled in EditorContainer

    return (
        <div className="video-editor-container">
            <h2 className="video-editor-title">GIF Editor</h2>

            <div className="preview-box editor-preview preview-box-video-resize editor-preview--resize preview-box-checkered editor-preview--checkered">
                {videoUrl ? (
                    <div className={`gif-preview-frame ${previewFrameClassName}`} style={{ backgroundColor: resizeBorderColor }}>
                        <video ref={videoRef} src={videoUrl} controls className="preview-video editor-preview-media gif-preview-video"
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

            <div className="card video-editor-actions editor-actions editor-actions--stack">
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

            <div className="card-actions card-actions-spaced editor-actions editor-actions--inline">
                <button type="button" className="btn-secondary" onClick={() => {
                    resetTransientEditorState()
                    onCancel?.()
                }}>
                    Cancel
                </button>
                <button
                    type="button"
                    className="btn-primary"
                    onClick={handleConvertToGif}
                    disabled={isProcessing || !videoUrl || duration <= 0}
                >
                    {isProcessing ? 'Downloading...' : 'Download GIF'}
                </button>
            </div>

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
