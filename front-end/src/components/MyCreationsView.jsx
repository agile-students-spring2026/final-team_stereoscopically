function MyCreationsView({ onCreateNew }) {
  return (
    <section className="card my-creations-card" aria-labelledby="my-creations-title">
      <h2 id="my-creations-title">My Creations</h2>
      <p className="my-creations-empty-state">
        Your saved creations will appear here once draft and save workflows are connected.
      </p>
      <div className="editor-actions editor-actions--spaced">
        <button type="button" className="btn-primary" onClick={onCreateNew}>
          Create New
        </button>
      </div>
    </section>
  )
}

export default MyCreationsView
