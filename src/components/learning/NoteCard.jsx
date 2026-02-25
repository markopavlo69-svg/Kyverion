// Strip markdown syntax for a clean card preview
function stripMarkdown(raw) {
  if (!raw) return ''
  return raw
    .replace(/```[\s\S]*?```/g, '')   // code blocks
    .replace(/#{1,3} /g, '')          // headings
    .replace(/\*\*(.+?)\*\*/g, '$1') // bold
    .replace(/\*(.+?)\*/g, '$1')     // italic
    .replace(/`(.+?)`/g, '$1')       // inline code
    .replace(/^[-*] /gm, '')         // list markers
    .replace(/^\d+\. /gm, '')        // ordered list
    .replace(/^---+$/gm, '')         // horizontal rules
    .replace(/\n{2,}/g, ' ')         // collapse blank lines
    .trim()
}

export default function NoteCard({ note, onOpen, onDelete }) {
  const rawPreview = stripMarkdown(note.content)
  const preview    = rawPreview.slice(0, 130)
  const hasMore    = rawPreview.length > 130
  const date = new Date(note.updatedAt ?? note.createdAt).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="note-card" onClick={() => onOpen(note)} style={{ cursor: 'pointer' }}>
      <div className="note-card__header">
        <h4 className="note-card__title">{note.title || 'Untitled'}</h4>
        <div className="note-card__actions" onClick={e => e.stopPropagation()}>
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

      <div className="note-card__footer">
        <span className="note-card__date">{date}</span>
        <span className="note-card__open-hint">Click to open</span>
      </div>
    </div>
  )
}
