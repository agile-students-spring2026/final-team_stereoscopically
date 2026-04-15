import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const GifEditor = ({
    videoFile,
    onCancel,
    onCreateGif,
    onOpenResize,
    onOpenFilters,
    onExportGif,
}) => {
    const [isProcessing, setIsProcessing] = useState(false)
    const [statusMessage, setStatusMessage] = useState(null)
    const [backendResult, setBackendResult] = useState(null)
    const [conversionError, setConversionError] = useState(null)

    const [duration, setDuration] = useState(0)
    const [trimStart, setTrimStart] = useState(0)
    const [trimEnd, setTrimEnd] = useState(0)
    const [showTrim, setShowTrim] = useState(false)

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
        // Not a File: do not preview, show error/placeholder
    }, [videoFile])

    useEffect(() => {
        if (!(videoFile instanceof File) || !videoUrl) return
        return () => {
            window.setTimeout(() => {
                URL.revokeObjectURL(videoUrl)
            }, 0)
        }
    }, [videoFile, videoUrl])

    useEffect(() => {
        setBackendResult(null)
        setStatusMessage(null)
        setConversionError(null)
        setDuration(0)
        setTrimStart(0)
        setTrimEnd(0)
        setShowTrim(false)

        if (videoRef.current) {
            videoRef.current.pause()
            videoRef.current.currentTime = 0
        }
    }, [videoFile])

    const formatTime = (s) => `${s.toFixed(1)}s`

    const resetTransientEditorState = useCallback((nextTrimEnd = duration, closeTrimPanel = true) => {
        setTrimStart(0)
        setTrimEnd(nextTrimEnd)
        if (closeTrimPanel) {
            setShowTrim(false)
        }
        setBackendResult(null)
        setStatusMessage(null)
        setConversionError(null)

        if (videoRef.current) {
            videoRef.current.pause()
            videoRef.current.currentTime = 0
        }
    }, [duration])
    
    const handleConvertToGif = async () => {
        if (isProcessing) return
        if (!videoFile || !videoUrl) {
            setConversionError('Video is not ready for conversion. Please re-upload and try again.')
            return
        }

        if (duration <= 0 || trimEnd <= trimStart) {
            setConversionError('Trim controls are not ready yet. Please wait for the video metadata to load.')
            return
        }

        setIsProcessing(true)
        setConversionError(null)
        setStatusMessage('Converting clip to GIF…')

        try {
            if (!onCreateGif) throw new Error('GIF conversion is not available right now.')
            const result = await onCreateGif(videoFile, trimStart, trimEnd)
            setBackendResult(result)
            setStatusMessage('GIF created successfully.')
        } catch (error) {
            setBackendResult(null)
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

            <div className="preview-box">
                {videoUrl ? (
                    <video ref={videoRef} src={videoUrl} controls className="preview-video"
                        onLoadedMetadata={() => {
                            const total = Number.isFinite(videoRef.current?.duration)
                                ? videoRef.current.duration
                                : 0
                            setDuration(total)
                            setTrimStart(0)
                            setTrimEnd(total)
                        }}
                        onTimeUpdate={() => {
                            if (trimEnd > 0 && videoRef.current && videoRef.current.currentTime >= trimEnd) {
                                videoRef.current.pause()
                                videoRef.current.currentTime = trimStart
                            }
                        }}
                    />
                ) : (
                    <p className="preview-label">Upload a video to start editing.</p>
                )}
            </div>

            {showTrim && (
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {duration > 0 ? (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '60px' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.7rem', color: '#8e8e93', textTransform: 'uppercase' }}>
                                        Start
                                    </div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{formatTime(trimStart)}</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.7rem', color: '#8e8e93', textTransform: 'uppercase' }}>
                                        End
                                    </div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{formatTime(trimEnd)}</div>
                                </div>
                            </div>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.9rem' }}>
                                Start
                                <input type="range" min={0} max={trimEnd} step={0.1} value={trimStart}
                                    onChange={(e) => {
                                        const val = Number(e.target.value)
                                        setTrimStart(val)
                                        if (videoRef.current) videoRef.current.currentTime = val
                                    }}
                                    style={{ width: '100%', accentColor: '#ffd60a' }} />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.9rem' }}>
                                End
                                <input type="range" min={trimStart} max={duration} step={0.1} value={trimEnd}
                                    onChange={(e) => setTrimEnd(Number(e.target.value))}
                                    style={{ width: '100%', accentColor: '#ffd60a' }} />
                            </label>
                            <button type="button"
                                style={{ background: 'none', border: 'none', color: '#007aff', fontSize: '0.9rem', fontWeight: '500', cursor: 'pointer' }}
                                onClick={() => resetTransientEditorState(duration, false)}>
                                Reset
                            </button>
                        </>
                    ) : (
                        <p className="preview-label" style={{ margin: 0 }}>
                            Loading trim controls…
                        </p>
                    )}
                </div>
            )}

            <div className="card video-editor-actions">
                <button type="button" className={`btn-primary ${showTrim ? 'active' : ''}`} onClick={() => setShowTrim((prev) => !prev)}>
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
                    resetTransientEditorState(duration)
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
                    {isProcessing ? 'Processing...' : 'Create GIF'}
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

            {backendResult?.id && (
            <button
                type="button"
                className="btn-primary"
                onClick={() => onExportGif(backendResult.id)}
                disabled={isProcessing}
            >
                Download GIF
            </button>
            )}

        </div>
    )
}

export default GifEditor
