import React, { useEffect, useMemo, useRef, useState } from 'react'

const GifEditor = ({ videoFile, onCancel }) => {
    const [isProcessing, setIsProcessing] = useState(false)
    const [statusMessage, setStatusMessage] = useState(null)
    const videoRef = useRef(null)
    const conversionTimeoutRef = useRef(null)

    const resolveVideoUrl = (source) => {
        if (!source) return null
        if (typeof source === 'string') return source
        return source.src || source.fullUrl || source.previewSrc || source.previewUrl || null
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
        if (!(videoFile instanceof File) || !videoUrl) {
            return undefined
        }

        return () => {
            URL.revokeObjectURL(videoUrl)
        }
    }, [videoFile, videoUrl])

    useEffect(() => () => {
        if (conversionTimeoutRef.current) {
            clearTimeout(conversionTimeoutRef.current)
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

    return (
        <div className="video-editor-container">
            <h2 className="video-editor-title">GIF Editor</h2>

            <div className="preview-box">
                {videoUrl ? (
                    <video ref={videoRef} src={videoUrl} controls className="preview-video" />
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