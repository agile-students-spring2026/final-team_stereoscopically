import EditorStatus from '../EditorStatus'
import EditorToolScreen from '../EditorToolScreen'

function GifToolPlaceholder({ title, description, onBack, onCancel }) {
  return (
    <EditorToolScreen
      title={title}
      subtitle={description}
      controls={(
        <div className="card filter-main-buttons">
          <EditorStatus centered>
            This editor option is wired into the GIF flow and ready for implementation.
          </EditorStatus>
        </div>
      )}
      actions={(
        <>
          <button type="button" className="btn-secondary" onClick={onBack}>
            Filter menu
          </button>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Back to editor
          </button>
        </>
      )}
    />
  )
}

export default GifToolPlaceholder