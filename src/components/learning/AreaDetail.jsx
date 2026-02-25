import { useState } from 'react'
import { useLearning } from '@context/LearningContext'
import { getCategoryName } from '@utils/categoryConfig'
import LearningTimer from './LearningTimer'
import NoteCard from './NoteCard'
import NoteEditor from './NoteEditor'
import LinkItem from './LinkItem'
import AreaForm from './AreaForm'

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${seconds}s`
}

export default function AreaDetail({ area, onBack }) {
  const { updateArea, deleteArea, addNote, updateNote, deleteNote, addLink, deleteLink, getAreaStats } = useLearning()
  const [tab,           setTab]           = useState('notes') // 'notes' | 'links'
  const [editingArea,   setEditingArea]   = useState(false)
  const [selectedNote,  setSelectedNote]  = useState(null) // note object when editing
  const [addLinkOpen,   setAddLinkOpen]   = useState(false)
  const [linkTitle,     setLinkTitle]     = useState('')
  const [linkUrl,       setLinkUrl]       = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const stats = getAreaStats(area.id)

  function handleSaveArea(updates) {
    updateArea(area.id, updates)
    setEditingArea(false)
  }

  // Open a note for editing inline
  function openNote(note) {
    setSelectedNote(note)
  }

  // Create a new note and immediately open it
  function handleAddNote() {
    const id = addNote(area.id, { title: '', content: '' })
    // Find the note just added — it won't be in `area` yet since state is async,
    // so we create a local stub and open it; the editor will auto-save on change
    setSelectedNote({ id, title: '', content: '', images: [] })
  }

  function handleDeleteNote(noteId) {
    if (selectedNote?.id === noteId) setSelectedNote(null)
    deleteNote(area.id, noteId)
  }

  function handleAddLink(e) {
    e.preventDefault()
    if (!linkUrl.trim()) return
    addLink(area.id, { title: linkTitle.trim() || linkUrl.trim(), url: linkUrl.trim() })
    setLinkTitle('')
    setLinkUrl('')
    setAddLinkOpen(false)
  }

  function handleDeleteArea() {
    deleteArea(area.id)
    onBack()
  }

  // ── If a note is open, render the inline editor ──────────────
  if (selectedNote) {
    // Get fresh note data from area state (for latest title/content after saves)
    const liveNote = area.notes?.find(n => n.id === selectedNote.id) ?? selectedNote
    return (
      <NoteEditor
        note={liveNote}
        areaId={area.id}
        onBack={() => setSelectedNote(null)}
      />
    )
  }

  return (
    <div className="area-detail">
      {/* Header */}
      <div className="area-detail__header">
        <button className="btn-back" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>

        <div className="area-detail__title-row">
          <span className="area-detail__icon" style={{ color: area.color }}>{area.icon}</span>
          <div>
            <h2 className="area-detail__name">{area.name}</h2>
            <p className="area-detail__category">{getCategoryName(area.category)}</p>
          </div>
          <div className="area-detail__header-actions">
            <button className="btn btn--ghost btn--sm" onClick={() => setEditingArea(true)}>
              Edit
            </button>
            <button
              className="btn btn--ghost btn--sm btn--danger-ghost"
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="area-detail__stats">
        <div className="detail-stat">
          <span className="detail-stat__val">{formatDuration(stats.todaySeconds)}</span>
          <span className="detail-stat__lbl">Learned Today</span>
        </div>
        <div className="detail-stat">
          <span className="detail-stat__val">{formatDuration(stats.totalSeconds)}</span>
          <span className="detail-stat__lbl">All-time</span>
        </div>
        <div className="detail-stat">
          <span className="detail-stat__val">{stats.totalXP} XP</span>
          <span className="detail-stat__lbl">Total Earned</span>
        </div>
        <div className="detail-stat">
          <span className="detail-stat__val">{area.sessions?.length ?? 0}</span>
          <span className="detail-stat__lbl">Sessions</span>
        </div>
      </div>

      {/* Timer */}
      <LearningTimer areaId={area.id} />

      {/* Tabs */}
      <div className="detail-tabs">
        <button
          className={`detail-tab${tab === 'notes' ? ' detail-tab--active' : ''}`}
          onClick={() => setTab('notes')}
        >
          📝 Notes ({area.notes?.length ?? 0})
        </button>
        <button
          className={`detail-tab${tab === 'links' ? ' detail-tab--active' : ''}`}
          onClick={() => setTab('links')}
        >
          🔗 Links ({area.links?.length ?? 0})
        </button>
      </div>

      {/* Notes tab */}
      {tab === 'notes' && (
        <div className="detail-content">
          <div className="detail-content__toolbar">
            <button className="btn btn--primary btn--sm" onClick={handleAddNote}>
              + New Note
            </button>
          </div>
          {!area.notes?.length ? (
            <div className="empty-section">
              <p>No notes yet. Start writing!</p>
            </div>
          ) : (
            <div className="notes-grid">
              {area.notes.map(note => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onOpen={openNote}
                  onDelete={handleDeleteNote}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Links tab */}
      {tab === 'links' && (
        <div className="detail-content">
          <div className="detail-content__toolbar">
            <button
              className="btn btn--primary btn--sm"
              onClick={() => setAddLinkOpen(v => !v)}
            >
              + Add Link
            </button>
          </div>

          {addLinkOpen && (
            <form className="add-link-form" onSubmit={handleAddLink}>
              <input
                className="form-input form-input--inline"
                placeholder="URL (required)"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                type="url"
                autoFocus
              />
              <input
                className="form-input form-input--inline"
                placeholder="Title (optional)"
                value={linkTitle}
                onChange={e => setLinkTitle(e.target.value)}
              />
              <button type="submit" className="btn btn--primary btn--sm">Save</button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAddLinkOpen(false)}>Cancel</button>
            </form>
          )}

          {!area.links?.length ? (
            <div className="empty-section">
              <p>No links saved yet.</p>
            </div>
          ) : (
            <div className="links-list">
              {area.links.map(link => (
                <LinkItem
                  key={link.id}
                  link={link}
                  onDelete={id => deleteLink(area.id, id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {editingArea && (
        <AreaForm area={area} onSave={handleSaveArea} onClose={() => setEditingArea(false)} />
      )}
      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(false)}>
          <div className="modal-box modal-box--sm" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Delete &quot;{area.name}&quot;?</h3>
            <p className="modal-body-text">This will permanently delete the area, all its notes, links and session history.</p>
            <div className="form-actions">
              <button className="btn btn--ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className="btn btn--danger" onClick={handleDeleteArea}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
