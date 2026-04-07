import { useEffect, useRef, useState } from 'react'
import { isVideoTypeSupported } from './videoSupport'

function CameraCapture({ onCapture, onCancel }) {
    const videoRef = useRef(null)
    const mediaRecorderRef = useRef(null)
    const chunksRef = useRef([])
    const streamRef = useRef(null)

    const [isRecording, setIsRecording] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
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
            streamRef.current?.getTracks().forEach(track => track.stop())
        }
    }, [])

    const handleTakePhoto = () => {
        const canvas = document.createElement('canvas')
        canvas.width = videoRef.current.videoWidth
        canvas.height = videoRef.current.videoHeight
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
        canvas.toBlob((blob) => {
            const file = new File([blob], 'camera.png', { type: 'image/png' })
            streamRef.current?.getTracks().forEach(track => track.stop())
            onCapture(file)
        }, 'image/png')
    }

    const handleStartRecording = () => {
        chunksRef.current = []
        const recorder = new MediaRecorder(streamRef.current)
        mediaRecorderRef.current = recorder

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data)
        }

        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' })
            const file = new File([blob], 'camera.webm', { type: 'video/webm' })
            streamRef.current?.getTracks().forEach(track => track.stop())
            // videoSupport 로 타입 확인 후 전달
            if (isVideoTypeSupported(file)) {
                onCapture(file)
            } else {
                setError('Recorded video format is not supported by your browser.')
            }
        }

        recorder.start()
        setIsRecording(true)
    }

    const handleStopRecording = () => {
        mediaRecorderRef.current?.stop()
        setIsRecording(false)
    }

    const handleCancel = () => {
        streamRef.current?.getTracks().forEach(track => track.stop())
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
                <button
                    type="button"
                    className="btn-primary"
                    onClick={handleTakePhoto}
                    disabled={isRecording}
                >
                    Take Photo
                </button>

                {!isRecording ? (
                    <button
                        type="button"
                        className="btn-primary"
                        onClick={handleStartRecording}
                    >
                        Record Video
                    </button>
                ) : (
                    <button
                        type="button"
                        className="btn-primary"
                        onClick={handleStopRecording}
                        style={{ background: '#ff3b30' }}
                    >
                        Stop Recording
                    </button>
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
