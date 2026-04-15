import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const DEFAULT_GIF_RESIZE_PRESET = 'square'
const GIF_RESIZE_PRESET_FRAME_CLASSES = {
    square: 'gif-preview-frame--square',
    landscape: 'gif-preview-frame--landscape',
    portrait: 'gif-preview-frame--portrait',
}
const DEFAULT_GIF_RESIZE_BORDER_COLOR = '#000000'

const GifEditor = ({
    videoFile,
    committedTrimStart = 0,
    committedTrimEnd = 0,
    committedResizePreset = DEFAULT_GIF_RESIZE_PRESET,
    committedResizeBorderColor = DEFAULT_GIF_RESIZE_BORDER_COLOR,
    onCancel,
    onCreateGif,
    onOpenTrim,
    onOpenResize,
    onOpenFilters,
    onExportGif,
}) => {
    const previewFrameClassName = GIF_RESIZE_PRESET_FRAME_CLASSES[committedResizePreset] || GIF_RESIZE_PRESET_FRAME_CLASSES[DEFAULT_GIF_RESIZE_PRESET]

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

    const resolveCommittedTrim = useCallback((totalDuration) => {
        const safeStart = Math.min(Math.max(committedTrimStart, 0), totalDuration)
        const candidateEnd = committedTrimEnd > 0 ? committedTrimEnd : totalDuration
        const safeEnd = Math.min(Math.max(candidateEnd, safeStart), totalDuration)

        return {
            start: safeStart,
            end: safeEnd,
        }
    }, [committedTrimEnd, committedTrimStart])

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
            const result = await onCreateGif(videoFile, trimStart, trimEnd, committedResizePreset, committedResizeBorderColor)

            if (!result?.id) {
                throw new Error('GIF conversion did not return a downloadable result.')
            }

            if (!onExportGif) {
                throw new Error('GIF export is not available right now.')
            }

            await onExportGif(result.id)
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

            <div className="preview-box preview-box-video-resize preview-box-checkered">
                {videoUrl ? (
                    <div className={`gif-preview-frame ${previewFrameClassName}`} style={{ backgroundColor: committedResizeBorderColor }}>
                        <video ref={videoRef} src={videoUrl} controls className="preview-video gif-preview-video"
                            onLoadedMetadata={() => {
                                const total = Number.isFinite(videoRef.current?.duration)
                                    ? videoRef.current.duration
                                    : 0
                                const nextTrim = resolveCommittedTrim(total)
                                setDuration(total)
                                setTrimStart(nextTrim.start)
                                setTrimEnd(nextTrim.end)
                                if (videoRef.current) {
                                    videoRef.current.currentTime = nextTrim.start
                                }
                            }}
                            onTimeUpdate={() => {
                                if (trimEnd > 0 && videoRef.current && videoRef.current.currentTime >= trimEnd) {
                                    videoRef.current.pause()
                                    videoRef.current.currentTime = trimStart
                                }
                            }}
                        />
                    </div>
                ) : (
                    <p className="preview-label">Upload a video to start editing.</p>
                )}
            </div>

            <div className="card video-editor-actions">
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

            <div className="card-actions card-actions-spaced">
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
                <p className="preview-label" style={{ marginTop: '0.75rem' }}>
                    {statusMessage}
                </p>
            )}

            {conversionError && (
                <p className="preview-label" style={{ marginTop: '0.75rem', color: '#ff3b30' }}>
                    {conversionError}
                </p>
            )}

        </div>
    )
}

export default GifEditor
