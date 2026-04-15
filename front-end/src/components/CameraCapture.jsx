import { useCallback, useEffect, useRef, useState } from 'react'

function CameraCapture({ onCapture, onCancel }) {
    const videoRef = useRef(null)
    const mediaRecorderRef = useRef(null)
    const chunksRef = useRef([])
    const streamRef = useRef(null)

    const [isRecording, setIsRecording] = useState(false)
    const [error, setError] = useState(null)

    const stopStream = useCallback(() => {
        const streams = []

        if (streamRef.current) {
            streams.push(streamRef.current)
        }

        const elementStream = videoRef.current?.srcObject
        if (elementStream instanceof MediaStream && elementStream !== streamRef.current) {
            streams.push(elementStream)
        }

        streams.forEach((stream) => {
            stream.getTracks().forEach((track) => {
                track.enabled = false
                track.stop()
            })
        })

        if (videoRef.current) {
            videoRef.current.pause()
            videoRef.current.srcObject = null
        }

        streamRef.current = null
    }, [])

    useEffect(() => {
        let isDisposed = false

        const startCamera = async () => {
            try {
                stopStream()
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })

                if (isDisposed) {
                    stream.getTracks().forEach((track) => {
                        track.enabled = false
                        track.stop()
                    })
                    return
                }

                streamRef.current = stream
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                }
            } catch (err) {
                setError('Could not access camera. Please check permissions.')
                console.error('Camera error:', err)
            }
        }
        startCamera()

        return () => {
            isDisposed = true
            stopStream()
        }
    }, [stopStream])

    const handleTakePhoto = () => {
        if (!videoRef.current || !streamRef.current) {
            setError('Camera is not ready yet. Please try again.')
            return
        }

        const canvas = document.createElement('canvas')
        canvas.width = videoRef.current.videoWidth
        canvas.height = videoRef.current.videoHeight
        if (!canvas.width || !canvas.height) {
            setError('Camera is not ready yet. Please try again.')
            return
        }

        canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
        // Turn off camera immediately after frame capture instead of waiting
        // for async blob encoding callback.
        stopStream()
        canvas.toBlob((blob) => {
            if (!blob) {
                setError('Failed to capture photo. Please try again.')
                return
            }

            const file = new File([blob], 'camera.png', { type: 'image/png' })
            onCapture(file)
        }, 'image/png')
    }

    const handleStartRecording = () => {
        if (!streamRef.current) {
            setError('Camera is not ready yet. Please try again.')
            return
        }

        chunksRef.current = []
        const recorder = new MediaRecorder(streamRef.current)
        mediaRecorderRef.current = recorder

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data)
        }

        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' })
            const file = new File([blob], 'camera.webm', { type: 'video/webm' })
            stopStream()
            setIsRecording(false)
            mediaRecorderRef.current = null
            onCapture(file)
        }

        recorder.start()
        setIsRecording(true)
    }

    const handleStopRecording = () => {
        const recorder = mediaRecorderRef.current
        if (!recorder) return

        if (recorder.state !== 'inactive') {
            recorder.stop()
            // Turn off camera/mic right away; recorder finalization still
            // continues and onstop will deliver the file.
            stopStream()
            setIsRecording(false)
        }
    }

    const handleCancel = () => {
        const recorder = mediaRecorderRef.current
        if (recorder && recorder.state !== 'inactive') {
            recorder.onstop = null
            recorder.stop()
        }

        setIsRecording(false)
        mediaRecorderRef.current = null
        stopStream()
        onCancel()
    }

    return (
        <div className="video-editor-container">
            <h2 className="video-editor-title">Camera</h2>

            <div className="preview-box">
                {error ? (
                    <p className="preview-label" style={{ color: '#ff3b30' }}>{error}</p>
                ) : (
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="preview-video"
                    />
                )}
            </div>

            <div className="card video-editor-actions">
                {!isRecording ? (
                    <>
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={handleTakePhoto}
                        >
                            Take Photo
                        </button>
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={handleStartRecording}
                        >
                            Record Video
                        </button>
                    </>
                ) : (
                    <>
                        <p className="camera-recording-status" role="status" aria-live="polite">
                            Recording in progress…
                        </p>
                        <button
                            type="button"
                            className="btn-primary btn-danger"
                            onClick={handleStopRecording}
                        >
                            Stop Recording
                        </button>
                    </>
                )}
            </div>

            <div className="card-actions card-actions-spaced">
                <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleCancel}
                >
                    Cancel
                </button>
            </div>
        </div>
    )
}

export default CameraCapture
