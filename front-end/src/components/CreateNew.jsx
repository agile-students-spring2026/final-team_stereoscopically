const CreateNew = ({ onImageSelect, onVideoSelect }) => {
  return (
    <div className="card create-new">
      <h2>Create New</h2>

      <div className="upload-options">
        <button type="button" className="upload-button" onClick={() => onImageSelect?.()}>
          Upload Image
        </button>

        <button type="button" className="upload-button" onClick={() => onVideoSelect?.()}>
          Upload Video
        </button>
      </div>
    </div>
  )
}

export default CreateNew