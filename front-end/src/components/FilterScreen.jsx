import EditorToolScreen from './EditorToolScreen'
import EditorStatus from './EditorStatus'

function FilterScreen({
  title,
  children,
  imageSrc,
  videoSrc,
  onApply,
  onCancel,
  previewInteractive = false,
  onPreviewPointerDown,
  onPreviewPointerMove,
  onPreviewPointerUp,
  onPreviewPointerCancel,
  onPreviewLostPointerCapture,
  previewOverlay = null,
  previewContainerRef = null,
  previewImageRef = null,
  actions = null,
}) {
  return (
    <EditorToolScreen
      title={title}
      onCancel={onCancel}
      onApply={onApply}
      preview={(
        <div
          ref={previewContainerRef}
          className={`preview-box editor-preview ${previewInteractive ? 'preview-box-interactive editor-preview--interactive' : ''}`}
          onPointerDown={previewInteractive ? onPreviewPointerDown : undefined}
          onPointerMove={previewInteractive ? onPreviewPointerMove : undefined}
          onPointerUp={previewInteractive ? onPreviewPointerUp : undefined}
          onPointerCancel={previewInteractive ? onPreviewPointerCancel : undefined}
          onLostPointerCapture={previewInteractive ? onPreviewLostPointerCapture : undefined}
        >
          {imageSrc ? (
            <img
              ref={previewImageRef}
              src={imageSrc}
              alt="Preview"
              className="preview-image editor-preview-media"
              draggable={previewInteractive ? false : undefined}
            />
          ) : videoSrc ? (
            <video src={videoSrc} controls className="preview-image editor-preview-media" />
          ) : (
            <EditorStatus centered>Preview of Creation</EditorStatus>
          )}

          {previewOverlay ? (
            <div className="filter-screen-preview-overlay">
              {previewOverlay}
            </div>
          ) : null}
        </div>
      )}
      controls={<div className="card filter-main-buttons">{children}</div>}
      actions={actions}
    />
  )
}

export default FilterScreen
