import React, {useState, useEffect, useRef } from 'react'

const GifEditor = ({ videoFile, onBack }) => {
    const [videoUrl, setVideoUrl] = useState(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const videoRef = useRef(null)

    useEffect(() => {
        if (videoFile) {
            const url = URL.createObjectURL(videoFile)
            setVideoUrl(url)

            return () => URL.revokeObjectURL(url)
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
        <div className='video-editor-container'>
            <h2 className='video-editor-title'>GIF Editor</h2>

            <div className='preview-box'>
                {videoUrl ? (
                    <video
                        ref={videoRef}
                        src={videoUrl}
                        controls
                        className='preview-video'
                        style={{maxWidth: '100%', borderRadius: '8px'}}
                    />
                    ) : (
                        <p className='preview-label'>Loading video preview...</p>
                        )}                    
            </div>

            <div className='editor-controls'>
                <div className='control-group'>
                    <p className='hint-text'>
                        Video format detected: <strong>{videoFile?.type}</strong>
                    </p>
                </div>
            </div>

            <div className='card video-editor-actions'>
                <button
                    className='btn-primary'
                    onClick={handleConvertToGif}
                    disabled={isProcessing}
                    >
                    {isProcessing ? 'Processing...': 'Create GIF'}
                </button>

                <button type="button" className="btn-primary">
                    Trim
                </button>
            </div>

            <div className="card-actions" style={{ marginTop: '1.25rem' }}>
                <button type="button" className="btn-secondary" onClick={onBack}>
                Cancel
                </button>
                <button type="button" className="btn-primary">
                Export
                </button>
            </div>

        </div>
    )
}

export default GifEditor