import React, { useEffect, useRef, useState } from 'react'
import { fetchMockVideos } from '../services/mockMediaService'

const GifEditor = ({ videoFile, onCancel }) => {
    const [isProcessing, setIsProcessing] = useState(false)
    const [videoUrl, setVideoUrl] = useState(null)
    const [isMockLoading, setIsMockLoading] = useState(false)
    const [mockError, setMockError] = useState(null)
    const [statusMessage, setStatusMessage] = useState(null)
    const objectUrlRef = useRef(null)
    const videoRef = useRef(null)
    const conversionTimeoutRef = useRef(null)

    const resolveVideoUrl = (source) => {
        if (!source) return null
        if (typeof source === 'string') return source
        return source.src || source.fullUrl || source.previewSrc || source.previewUrl || null
    }

    useEffect(() => {
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current)
            objectUrlRef.current = null
        }

        if (!videoFile) {
            setVideoUrl(null)
            return undefined
        }

        setMockError(null)

        if (videoFile instanceof File) {
            try {
                const url = URL.createObjectURL(videoFile)
                objectUrlRef.current = url
                setVideoUrl(url)
            } catch (error) {
                console.error('[GifEditor] Unable to create preview for uploaded video', error)
                setVideoUrl(null)
            }
        } else {
            setVideoUrl(resolveVideoUrl(videoFile))
        }

        return () => {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current)
                objectUrlRef.current = null
            }
        }
    }, [videoFile])

    useEffect(() => {
        if (videoFile) {
            setIsMockLoading(false)
            return undefined
        }

        let isCancelled = false

        const loadMockVideo = async () => {
            setIsMockLoading(true)
            setMockError(null)

            try {
                const videos = await fetchMockVideos()
                if (isCancelled) return

                const firstVideo = videos?.[0]
                if (!firstVideo) {
                    setMockError('No mock videos available yet.')
                    return
                }

                setVideoUrl(resolveVideoUrl(firstVideo))
            } catch (error) {
                if (!isCancelled) {
                    console.error('[GifEditor] Unable to load mock videos', error)
                    setMockError('Failed to load sample video. Try uploading your own clip instead.')
                }
            } finally {
                if (!isCancelled) {
                    setIsMockLoading(false)
                }
            }
        }

        loadMockVideo()

        return () => {
            isCancelled = true
        }
    }, [videoFile])

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
                                        <video
                                                ref={videoRef}
                                                src={videoUrl}
                                                controls
                                                className="preview-video"
                                        />
                                        ) : isMockLoading ? (
                                                <p className="preview-label">Loading sample video...</p>
                                        ) : mockError ? (
                                                <p className="preview-label">{mockError}</p>
                                        ) : (
                                                <p className="preview-label">No video available.</p>
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
                    {isProcessing ? 'Processing...': 'Create GIF'}
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