function CreateNew() {
  return (
    <div>
      <h1>Create New</h1>

      <label htmlFor="image-upload" style={{ cursor: "pointer" }}>
        Upload Image
      </label>

      <input
        id="image-upload"
        type="file"
        accept="image/*"
        style={{ display: "none" }}
      />
    </div>
  );
}

export default CreateNew;