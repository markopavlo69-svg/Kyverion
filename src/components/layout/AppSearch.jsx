import { useEffect, useRef, useState } from 'react'
import { useTasks } from '@context/TaskContext'
import { useHabits } from '@context/HabitContext'
import { useAppointments } from '@context/AppointmentContext'
import { useLearning } from '@context/LearningContext'

function highlight(text, query) {
  if (!query || !text) return text
  const idx = String(text).toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="search-highlight">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

const MODULE_ICONS = {
  task:        '✓',
  habit:       '🔥',
  appointment: '📅',
  area:        null,
  note:        '📝',
  link:        '🔗',
}

export default function AppSearch({ onNavigate, onClose }) {
  const { tasks }        = useTasks()
  const { habits }       = useHabits()
  const { appointments } = useAppointments()
  const { areas }        = useLearning()

  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const q = query.trim().toLowerCase()
  const results = []

  if (q.length >= 1) {
    // Tasks
    for (const t of tasks) {
      if (t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)) {
        results.push({ type: 'task', id: t.id, label: t.title, sub: `Task · ${t.priority}`, page: 'tasks' })
      }
    }
    // Habits
    for (const h of habits) {
      if (h.name.toLowerCase().includes(q) || h.description?.toLowerCase().includes(q)) {
        results.push({ type: 'habit', id: h.id, label: h.name, sub: 'Habit', page: 'habits' })
      }
    }
    // Appointments
    for (const a of appointments) {
      if (
        a.title.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.location?.toLowerCase().includes(q)
      ) {
        results.push({ type: 'appointment', id: a.id, label: a.title, sub: `Calendar · ${a.date}`, page: 'calendar' })
      }
    }
    // Learning areas, notes, links
    for (const area of areas) {
      if (area.name.toLowerCase().includes(q)) {
        results.push({ type: 'area', id: area.id, label: area.name, sub: 'Learning Area', icon: area.icon, page: 'learning' })
      }
      for (const note of area.notes ?? []) {
        if (note.title?.toLowerCase().includes(q) || note.content?.toLowerCase().includes(q)) {
          results.push({ type: 'note', id: note.id, label: note.title || 'Untitled', sub: `Note in ${area.name}`, page: 'learning' })
        }
      }
      for (const link of area.links ?? []) {
        if (link.title?.toLowerCase().includes(q) || link.url?.toLowerCase().includes(q)) {
          results.push({ type: 'link', id: link.id, label: link.title, sub: `Link in ${area.name}`, page: 'learning' })
        }
      }
    }
  }

  function handleSelect(result) {
    onNavigate(result.page)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="search-box" onClick={e => e.stopPropagation()}>
        <div className="search-input-wrap">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            className="search-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tasks, habits, appointments, notes…"
          />
          {query && (
            <button className="search-clear" onClick={() => setQuery('')}>✕</button>
          )}
        </div>

        {q.length >= 1 && (
          <div className="search-results">
            {results.length === 0 ? (
              <div className="search-empty">No results for "{query}"</div>
            ) : (
              results.map((r, i) => (
                <button
                  key={i}
                  className="search-result-item"
                  onClick={() => handleSelect(r)}
                >
                  <span className="search-result-icon">
                    {r.icon ?? MODULE_ICONS[r.type] ?? '•'}
                  </span>
                  <div className="search-result-body">
                    <span className="search-result-label">{highlight(r.label, query)}</span>
                    <span className="search-result-sub">{r.sub}</span>
                  </div>
                  <span className="search-result-page">{r.page}</span>
                </button>
              ))
            )}
          </div>
        )}

        {q.length === 0 && (
          <div className="search-placeholder">
            Search tasks, habits, appointments, notes and more…
          </div>
        )}
      </div>
    </div>
  )
}
