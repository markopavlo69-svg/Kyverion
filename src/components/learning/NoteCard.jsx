export default function NoteCard({ note, onEdit, onDelete }) {
  const preview = note.content?.slice(0, 120) || ''
  const hasMore = note.content?.length > 120
  const date = new Date(note.updatedAt ?? note.createdAt).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="note-card">
      <div className="note-card__header">
        <h4 className="note-card__title">{note.title}</h4>
        <div className="note-card__actions">
          <button className="icon-btn" onClick={() => onEdit(note)} title="Edit note">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M10 2l2 2-7 7H3V9l7-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="icon-btn icon-btn--danger" onClick={() => onDelete(note.id)} title="Delete note">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 4h10M5 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M6 7v3M8 7v3M3 4l.8 7.5A.5.5 0 004.3 12h5.4a.5.5 0 00.5-.5L11 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {preview && (
        <p className="note-card__preview">
          {preview}{hasMore && <span className="note-card__more">…</span>}
        </p>
      )}

      {note.images?.length > 0 && (
        <div className="note-card__images">
          {note.images.slice(0, 3).map(img => (
            <img key={img.id} src={img.data} alt={img.name} className="note-card__img" />
          ))}
          {note.images.length > 3 && (
            <span className="note-card__img-more">+{note.images.length - 3}</span>
          )}
        </div>
      )}

      <div className="note-card__footer">
        <span className="note-card__date">{date}</span>
        {note.images?.length > 0 && (
          <span className="note-card__img-count">🖼 {note.images.length}</span>
        )}
      </div>
    </div>
  )
}
