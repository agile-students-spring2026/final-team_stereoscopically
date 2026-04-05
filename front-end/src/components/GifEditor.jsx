import React, { useEffect, useMemo, useRef, useState } from 'react'

const GifEditor = ({ videoFile, onCancel }) => {
    const [isProcessing, setIsProcessing] = useState(false)
    const [statusMessage, setStatusMessage] = useState(null)
    const videoRef = useRef(null)
    const conversionTimeoutRef = useRef(null)
    const errorTimeoutRef = useRef(null)
    const canPlayRef = useRef(false)

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
        // Not a File: do not preview, show error/placeholder
        return null
    }, [videoFile])

    // Loading and error state for video
    const [videoLoading, setVideoLoading] = useState(false)
    const [videoError, setVideoError] = useState(false)


    // Only revoke blob URLs in production to avoid dev Hot Reload revoking active URLs
    useEffect(() => {
        let prevUrl = null
        if (videoFile instanceof File && videoUrl) {
            prevUrl = videoUrl
        }
        return () => {
            if (prevUrl && !import.meta.env.DEV) {
                URL.revokeObjectURL(prevUrl)
            }
        }
    }, [videoFile, videoUrl])

    useEffect(() => () => {
        if (conversionTimeoutRef.current) {
            clearTimeout(conversionTimeoutRef.current)
        }
        if (errorTimeoutRef.current) {
            clearTimeout(errorTimeoutRef.current)
        }
    }, [])

    const handleConvertToGif = () => {
        if (!videoUrl || isProcessing) return

        setIsProcessing(true)
        setStatusMessage('Converting clip to GIF…')

        conversionTimeoutRef.current = setTimeout(() => {
            setStatusMessage('GIF export is on the roadmap. You will be able to download the generated GIF in a future update.')
            setIsProcessing(false)
            conversionTimeoutRef.current = null
        }, 2000)
    }

    // No longer need to check support here; handled in EditorContainer

    return (
        <div className="video-editor-container">
            <h2 className="video-editor-title">GIF Editor</h2>



            <div className="preview-box preview-box-video" style={{ position: 'relative', minHeight: 220 }}>
                {videoFile && !(videoFile instanceof File) ? (
                    <p className="preview-label" style={{ color: 'red' }}>Error: Only user-uploaded video files are supported.</p>
                ) : videoUrl ? (
                    <>
                        {videoLoading && !videoError && (
                            <div style={{
                                position: 'absolute',
                                top: 0, left: 0, right: 0, bottom: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'rgba(255,255,255,0.7)', zIndex: 2
                            }}>
                                <div className="spinner" style={{ width: 40, height: 40, border: '4px solid #ccc', borderTop: '4px solid #333', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                <span style={{ marginLeft: 12 }}>Loading video…</span>
                            </div>
                        )}
                        {!videoError ? (
                            <video
                                ref={videoRef}
                                src={videoUrl}
                                controls
                                preload="auto"
                                className="preview-video"
                                onLoadStart={() => {
                                    setVideoLoading(true)
                                    setVideoError(false)
                                    canPlayRef.current = false
                                }}
                                onCanPlay={() => {
                                    setVideoLoading(false)
                                    setVideoError(false)
                                    canPlayRef.current = true
                                    if (errorTimeoutRef.current) {
                                        clearTimeout(errorTimeoutRef.current)
                                        errorTimeoutRef.current = null
                                    }
                                }}
                                onError={() => {
                                    if (errorTimeoutRef.current) {
                                        clearTimeout(errorTimeoutRef.current)
                                    }
                                    // Delay error display to avoid false positives on slow loads
                                    errorTimeoutRef.current = setTimeout(() => {
                                        if (!canPlayRef.current) {
                                            setVideoLoading(false)
                                            setVideoError(true)
                                        }
                                    }, 3000)
                                }}
                            />
                        ) : (
                            <div style={{
                                position: 'absolute',
                                top: 0, left: 0, right: 0, bottom: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'rgba(255,255,255,0.9)', zIndex: 3
                            }}>
                                <p className="preview-label" style={{ color: 'red', textAlign: 'center' }}>
                                    Unable to preview this video.<br />
                                    The file may be corrupt or use an unsupported codec.<br />
                                    Please try a different video.
                                </p>
                            </div>
                        )}
                        <style>{`
                            @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }
                        `}</style>
                    </>
                ) : (
                    <p className="preview-label">Upload a video to start editing.</p>
                )}
            </div>

            <div className="card video-editor-actions">
                <button type="button" className="btn-primary">
                    Trim
                </button>

                <button type="button" className="btn-primary">
                    Reframe
                </button>

                <button type="button" className="btn-primary">
                    Filters
                </button>
            </div>

            <div className="card-actions card-actions-spaced">
                <button type="button" className="btn-secondary" onClick={() => onCancel?.()}>
                    Cancel
                </button>

                <button
                    type="button"
                    className="btn-primary"
                    onClick={handleConvertToGif}
                    disabled={isProcessing || !videoUrl}
                >
                    {isProcessing ? 'Processing...' : 'Create GIF'}
                </button>
            </div>

            {statusMessage && (
                <p className="preview-label" style={{ marginTop: '0.75rem' }}>
                    {statusMessage}
                </p>
            )}
        </div>
    )
}

export default GifEditor