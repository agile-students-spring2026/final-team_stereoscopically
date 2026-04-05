import React, { useEffect, useMemo, useRef, useState } from 'react'

const GifEditor = ({ videoFile, onCancel }) => {
    const [isProcessing, setIsProcessing] = useState(false)
    const [statusMessage, setStatusMessage] = useState(null)

    const [duration, setDuration] = useState(0)
    const [trimStart, setTrimStart] = useState(0)
    const [trimEnd, setTrimEnd] = useState(0)
    const [showTrim, setShowTrim] = useState(false)

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
        return resolveVideoUrl(videoFile)
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

    const formatTime = (s) => `${s.toFixed(1)}s`

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

            <div className="preview-box">
                {videoUrl ? (
                    <video ref={videoRef} src={videoUrl} controls className="preview-video"
                        onLoadedMetadata={() => {
                            const total = videoRef.current.duration
                            setDuration(total)
                            setTrimEnd(total)
                        }}
                    />
                ) : (
                    <p className="preview-label">Upload a video to start editing.</p>
                )}
            </div>

            {showTrim && duration > 0 && (
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                            onChange={(e) => setTrimStart(Number(e.target.value))}
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
                        onClick={() => { setTrimStart(0); setTrimEnd(duration) }}>
                        Reset
                    </button>
                </div>
            )}

            <div className="card video-editor-actions">
                <button type="button" className={`btn-primary ${showTrim ? 'active' : ''}`} onClick={() => setShowTrim((prev) => !prev)}>
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
