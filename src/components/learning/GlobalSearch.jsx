import { useEffect, useRef, useState } from 'react'
import { useLearning } from '@context/LearningContext'

function highlight(text, query) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="search-highlight">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export default function GlobalSearch({ onNavigate, onClose }) {
  const { areas } = useLearning()
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const q = query.trim().toLowerCase()

  const results = []
  if (q.length >= 1) {
    for (const area of areas) {
      // Match area name
      if (area.name.toLowerCase().includes(q)) {
        results.push({ type: 'area', area, label: area.name, sub: 'Area' })
      }
      // Match notes
      for (const note of area.notes ?? []) {
        if (note.title.toLowerCase().includes(q) || note.content?.toLowerCase().includes(q)) {
          results.push({ type: 'note', area, note, label: note.title, sub: `Note in ${area.name}` })
        }
      }
      // Match links
      for (const link of area.links ?? []) {
        if (link.title.toLowerCase().includes(q) || link.url.toLowerCase().includes(q)) {
          results.push({ type: 'link', area, link, label: link.title, sub: `Link in ${area.name}` })
        }
      }
    }
  }

  function handleSelect(result) {
    onNavigate(result.area.id)
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
            placeholder="Search areas, notes, links…"
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
                    {r.type === 'area' ? r.area.icon :
                     r.type === 'note' ? '📝' : '🔗'}
                  </span>
                  <div className="search-result-body">
                    <span className="search-result-label">{highlight(r.label, query)}</span>
                    <span className="search-result-sub">{r.sub}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {q.length === 0 && (
          <div className="search-placeholder">
            Start typing to search across all areas, notes and links
          </div>
        )}
      </div>
    </div>
  )
}
