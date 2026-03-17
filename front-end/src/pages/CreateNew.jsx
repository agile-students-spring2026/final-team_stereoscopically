function CreateNew({ onOpenCamera, onUploadImage, onUploadVideo, onCancel }) {
  return (
    <div className="app-container">
      <div className="screen-header">
        <div className="app-logo">StickerCreate</div>
        <h2 className="screen-title">Create New</h2>
      </div>
      <div className="card">
        <button type="button" className="btn-primary" onClick={onOpenCamera}>
          Open Camera
        </button>
        <button type="button" className="btn-primary" onClick={onUploadImage}>
          Upload Image
        </button>
        <button type="button" className="btn-primary" onClick={onUploadVideo}>
          Upload Video
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default CreateNew;
