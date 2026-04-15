import EditorToolScreen from './EditorToolScreen'

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
}) {
  return (
    <EditorToolScreen
      title={title}
      onCancel={onCancel}
      onApply={onApply}
      preview={(
        <div
          ref={previewContainerRef}
          className={`preview-box ${previewInteractive ? 'preview-box-interactive' : ''}`}
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
              className="preview-image"
              draggable={previewInteractive ? false : undefined}
            />
          ) : videoSrc ? (
            <video src={videoSrc} controls className="preview-image" />
          ) : (
            <span className="preview-label">Preview of Creation</span>
          )}

          {previewOverlay ? (
            <div className="filter-screen-preview-overlay">
              {previewOverlay}
            </div>
          ) : null}
        </div>
      )}
      controls={<div className="card filter-main-buttons">{children}</div>}
    />
  )
}

export default FilterScreen
