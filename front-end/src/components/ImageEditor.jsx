import ImagePreview from "./ImagePreview"

const ImageEditor = ({ imageSrc, onBack, onOpenFilters }) => {
  return (
    <>
    <div className="card image-editor">
      <h2>Image Editor</h2>

      <ImagePreview src={imageSrc} />
      <button className="btn-primary" onClick={onBack}>Back</button>
      <button className="btn-primary" onClick={onOpenFilters}>Add Filters</button>
      
    </div>
    </>
  )
}

export default ImageEditor