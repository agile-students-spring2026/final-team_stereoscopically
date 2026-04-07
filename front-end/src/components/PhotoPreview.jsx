import { useEffect, useState } from 'react'

function PhotoPreview({ file, onRetake, onConfirm, onBack }) {
    const [previewUrl, setPreviewUrl] = useState(null)

    useEffect(() => {
        if (!file) return
        const url = URL.createObjectURL(file)
        setPreviewUrl(url)
        
        // Cleanup to prevent memory leaks
        return () => URL.revokeObjectURL(url)
    }, [file])

    const isVideo = file?.type.startsWith('video/')

    return (
        <div className="video-editor-container">
            <h2 className="video-editor-title">
                Preview {isVideo ? 'Video' : 'Photo'}
            </h2>

            <div className="preview-box">
                {isVideo ? (
                    <video 
                        src={previewUrl} 
                        controls 
                        className="preview-video" 
                    />
                ) : (
                    <img 
                        src={previewUrl} 
                        alt="Captured" 
                        className="preview-video" 
                    />
                )}
            </div>

            <div className="card video-editor-actions">
                <button
                    type="button"
                    className="btn-primary"
                    onClick={onConfirm}
                >
                    Confirm
                </button>

                <button
                    type="button"
                    className="btn-primary"
                    onClick={onRetake}
                >
                    Retake
                </button>
            </div>

            <div className="card-actions card-actions-spaced">
                <button
                    type="button"
                    className="btn-secondary"
                    onClick={onBack}
                >
                    Cancel
                </button>
            </div>
        </div>
    )
}

export default PhotoPreview