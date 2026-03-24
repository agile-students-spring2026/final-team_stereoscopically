import React, { useEffect, useRef, useState } from 'react'

const GifEditor = ({ videoFile, onCancel }) => {
    console.log('=== GifEditor MOUNTED ===')
    console.log('videoFile prop:', videoFile)
    console.log('videoFile type:', typeof videoFile)
    console.log('videoFile instanceof File:', videoFile instanceof File)
    
    const [isProcessing, setIsProcessing] = useState(false)
    const [videoUrl, setVideoUrl] = useState(null)
    const videoRef = useRef(null)

    useEffect(() => {
        console.log('GifEditor effect: videoFile =', videoFile)
        if (!videoFile) {
            setVideoUrl(null)
            return
        }

        let url
        try {
            url = URL.createObjectURL(videoFile)
            console.log('GifEditor effect: created videoUrl =', url)
            setVideoUrl(url)
        } catch (err) {
            console.error('GifEditor effect: ERROR creating blob URL', err)
            setVideoUrl(null)
        }

        return () => {
            if (url) {
                console.log('GifEditor effect cleanup: revoking videoUrl =', url)
                URL.revokeObjectURL(url)
            }
        }
    }, [videoFile])

    const handleConvertToGif = async () => {
        setIsProcessing(true)
        console.log('Starting GIF Conversion for: ', videoFile.name)

        setTimeout(() => {
            alert('GIF conversion logic has not been implemented yet...')
            setIsProcessing(false)
        }, 2000 )
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
                    ) : (
                        <p className="preview-label">Loading video preview...</p>
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
                    disabled={isProcessing}
                    >
                    {isProcessing ? 'Processing...': 'Create GIF'}
                </button>
            </div>
        </div>
    )
}

export default GifEditor