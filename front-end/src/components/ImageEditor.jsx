import ImagePreview from "./ImagePreview"

const ImageEditor = ({ imageSrc, onBack, onOpenFilters }) => {
  return (
    <>
    <div className="card image-editor">
      <h2>Image Editor</h2>

      <ImagePreview src={imageSrc} />
      <button onClick={onBack}>Back</button>
      <button className="filters-trigger-button" onClick={onOpenFilters}>Add Filters</button>

    </div>
    <div className="editor-actions">
    </div>
    </>
  )
}

export default ImageEditor