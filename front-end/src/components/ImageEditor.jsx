const ImageEditor = ({ imageSrc }) => {
  return (
    <div className="card image-editor">
      <h2>Image Editor</h2>
      <img src={imageSrc} alt="Uploaded preview" style={{ maxWidth: '300px', borderRadius: '8px', border: '1px solid #ddd' }} />
    </div>
  )
}

export default ImageEditor