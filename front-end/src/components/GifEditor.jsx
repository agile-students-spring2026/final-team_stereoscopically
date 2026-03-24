import React, { useEffect, useMemo, useRef, useState } from 'react'

const GifEditor = ({ videoFile, onBack }) => {
    const [isProcessing, setIsProcessing] = useState(false)
    const videoRef = useRef(null)

    const videoUrl = useMemo(() => {
        if (!videoFile) return null
        return URL.createObjectURL(videoFile)
    }, [videoFile])

    useEffect(() => {
        return () => {
            if (videoUrl) {
                URL.revokeObjectURL(videoUrl)
            }
        }
    }, [videoUrl])

    const handleConvertToGif = async () => {
        setIsProcessing(true)
        console.log('Starting GIF Conversion for: ', videoFile.name)

        setTimeout(() => {
            alert('GIF conversion logic has not been implemented yet...')
            setIsProcessing(false)
        }, 2000 )
    }

    return (
        <div className='video-editor-container'>
            <h2 className='video-editor-title'>GIF Editor</h2>

            <div className='preview-box'>
                {videoUrl ? (
                    <video
                        ref={videoRef}
                        src={videoUrl}
                        controls
                        className='preview-video'
                    />
                    ) : (
                        <p className='preview-label'>Loading video preview...</p>
                        )}                    
            </div>

            <div className='card video-editor-actions'>
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

            <div className="card-actions" style={{ marginTop: '1.25rem' }}>
                <button type="button" className="btn-secondary" onClick={onBack}>
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