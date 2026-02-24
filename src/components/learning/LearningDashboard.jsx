import { useState } from 'react'
import { useLearning } from '@context/LearningContext'
import AreaCard from './AreaCard'
import AreaForm from './AreaForm'
import GlobalSearch from './GlobalSearch'

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  if (seconds > 0) return `${seconds}s`
  return '—'
}

export default function LearningDashboard({ onSelectArea }) {
  const { areas, addArea, updateArea, deleteArea, getTotalStats } = useLearning()
  const [showAreaForm, setShowAreaForm] = useState(false)
  const [editingArea, setEditingArea] = useState(null)
  const [showSearch, setShowSearch] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null) // area id

  const stats = getTotalStats()

  function handleCreateArea(data) {
    addArea(data)
    setShowAreaForm(false)
  }

  function handleEditArea(data) {
    updateArea(editingArea.id, data)
    setEditingArea(null)
  }

  function handleDeleteArea(id) {
    setConfirmDelete(id)
  }

  function confirmDeleteArea() {
    deleteArea(confirmDelete)
    setConfirmDelete(null)
  }

  // Keyboard shortcut: Ctrl+K opens search
  useState(() => {
    const handler = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  return (
    <div className="learning-dashboard">
      {/* Page header */}
      <div className="learning-header">
        <div>
          <h1 className="learning-title">Learning Hub</h1>
          <p className="learning-subtitle">Track time, earn XP, build knowledge</p>
        </div>
        <div className="learning-header-actions">
          <button
            className="btn btn--ghost btn--sm search-trigger"
            onClick={() => setShowSearch(true)}
            title="Search (Ctrl+K)"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            Search
            <kbd className="kbd">Ctrl K</kbd>
          </button>
          <button className="btn btn--primary" onClick={() => setShowAreaForm(true)}>
            + New Area
          </button>
        </div>
      </div>

      {/* Global stats */}
      <div className="dashboard-stats">
        <div className="dash-stat-card">
          <span className="dash-stat__icon">⏱</span>
          <div>
            <div className="dash-stat__val">{formatDuration(stats.todaySeconds)}</div>
            <div className="dash-stat__lbl">Learned Today</div>
          </div>
        </div>
        <div className="dash-stat-card">
          <span className="dash-stat__icon">📖</span>
          <div>
            <div className="dash-stat__val">{formatDuration(stats.totalSeconds)}</div>
            <div className="dash-stat__lbl">All-time Learning</div>
          </div>
        </div>
        <div className="dash-stat-card">
          <span className="dash-stat__icon">⚡</span>
          <div>
            <div className="dash-stat__val">{stats.totalXP} XP</div>
            <div className="dash-stat__lbl">Total XP Earned</div>
          </div>
        </div>
        <div className="dash-stat-card">
          <span className="dash-stat__icon">🧩</span>
          <div>
            <div className="dash-stat__val">{areas.length}</div>
            <div className="dash-stat__lbl">Active Areas</div>
          </div>
        </div>
      </div>

      {/* Areas grid */}
      {areas.length === 0 ? (
        <div className="empty-section empty-section--center">
          <div className="empty-icon">📚</div>
          <p>No learning areas yet. Create your first one!</p>
          <button className="btn btn--primary" onClick={() => setShowAreaForm(true)}>
            + New Area
          </button>
        </div>
      ) : (
        <>
          <h2 className="section-heading">Your Areas</h2>
          <div className="areas-grid">
            {areas.map(area => (
              <AreaCard
                key={area.id}
                area={area}
                onClick={() => onSelectArea(area.id)}
                onEdit={a => setEditingArea(a)}
                onDelete={handleDeleteArea}
              />
            ))}
            <button
              className="area-card area-card--add"
              onClick={() => setShowAreaForm(true)}
            >
              <span className="area-card-add__icon">+</span>
              <span className="area-card-add__label">New Area</span>
            </button>
          </div>
        </>
      )}

      {/* Modals */}
      {showAreaForm && (
        <AreaForm onSave={handleCreateArea} onClose={() => setShowAreaForm(false)} />
      )}
      {editingArea && (
        <AreaForm area={editingArea} onSave={handleEditArea} onClose={() => setEditingArea(null)} />
      )}
      {showSearch && (
        <GlobalSearch onNavigate={onSelectArea} onClose={() => setShowSearch(false)} />
      )}
      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="modal-box modal-box--sm" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Delete area?</h3>
            <p className="modal-body-text">All notes, links and session history will be permanently removed.</p>
            <div className="form-actions">
              <button className="btn btn--ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn--danger" onClick={confirmDeleteArea}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
