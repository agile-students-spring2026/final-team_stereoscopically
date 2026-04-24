import { useEffect, useMemo } from 'react'

function PhotoPreview({ file, onRetake, onConfirm, onBack }) {
    const previewUrl = useMemo(() => {
        if (!file) return null
        return URL.createObjectURL(file)
    }, [file])

    useEffect(() => {
        if (!previewUrl) return

        // In dev/StrictMode, immediate revoke can cause noisy blob ERR_FILE_NOT_FOUND
        // while video elements are still resolving the previous URL.
        return () => {
            if (import.meta.env.PROD) {
                URL.revokeObjectURL(previewUrl)
            }
        }
    }, [previewUrl])

    const isVideo = file?.type.startsWith('video/')

    return (
        <div className="video-editor-container">
            <h2 className="editor-shell-title">
                Preview {isVideo ? 'Video' : 'Photo'}
            </h2>

            <div className="editor-preview">
                {isVideo ? (
                    <video 
                        src={previewUrl} 
                        controls 
                        className="editor-preview-media" 
                    />
                ) : (
                    <img 
                        src={previewUrl} 
                        alt="Captured" 
                        className="editor-preview-media" 
                    />
                )}
            </div>

            <div className="card editor-actions editor-actions--stack">
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

            <div className="editor-actions editor-actions--spaced editor-actions--inline">
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