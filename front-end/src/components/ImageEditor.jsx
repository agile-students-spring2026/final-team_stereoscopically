const ImageEditor = ({ imageSrc }) => {
  return (
    <div className="card image-editor">
      <h2>Image Editor</h2>
      <img src={imageSrc} alt="Uploaded preview" className="image-editor-img" />
    </div>
  )
}

export default ImageEditor