import React, { useEffect, useMemo, useRef, useState } from 'react'
import { convertVideoToGif } from '../services/backendGifService'

const GifEditor = ({ videoFile, onCancel, onConverted }) => {
    const [isProcessing, setIsProcessing] = useState(false)
    const [statusMessage, setStatusMessage] = useState(null)
    const [backendResult, setBackendResult] = useState(null)
    const [validationError, setValidationError] = useState(null)
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

    useEffect(() => {
        if (backendResult) {
            onConverted?.(backendResult)
        }
    }, [backendResult, onConverted])

    useEffect(() => {
        setBackendResult(null)
        setStatusMessage(null)
        setValidationError(null)
        setConversionError(null)
    }, [videoFile])

    useEffect(() => {
        if (!videoFile || !(videoFile instanceof File)) {
            setValidationError(null)
            return
        }

        const maxSizeBytes = 50 * 1024 * 1024

        if (!videoFile.type?.startsWith('video/')) {
            setValidationError('Please select a video file.')
            return
        }

        if (videoFile.size > maxSizeBytes) {
            setValidationError('File is too large (max 50 MB).')
            return
        }

        setValidationError(null)
    }, [videoFile])

    const formatTime = (s) => `${s.toFixed(1)}s`

    const handleConvertToGif = async () => {
        if (!videoFile || validationError || isProcessing) return
        setIsProcessing(true)
        setConversionError(null)
        setStatusMessage('Converting clip to GIF…')

        try {
            const result = await convertVideoToGif(videoFile)
            setBackendResult(result)
            setStatusMessage('GIF created. Download support is coming soon.')
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

            {conversionError && (
                <p className="preview-label" style={{ marginTop: '0.75rem', color: '#ff3b30' }}>
                    {conversionError}
                </p>
            )}

            {backendResult?.url && (
                <div className="card" style={{ marginTop: '1rem' }}>
                    <h3 style={{ marginBottom: '0.5rem' }}>Your GIF is ready</h3>
                    <p className="preview-label" style={{ margin: 0 }}>
                        ID: {backendResult.id || 'pending'}
                    </p>
                    <p className="preview-label" style={{ margin: 0 }}>
                        URL: {backendResult.url}
                    </p>
                </div>
            )}

            {validationError && (
                <p className="preview-label" style={{ marginTop: '0.75rem', color: '#ff3b30' }}>
                    {validationError}
                </p>
            )}
        </div>
    )
}

export default GifEditor
