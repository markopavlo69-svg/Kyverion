import { useState } from 'react'
import { CATEGORIES, CATEGORY_LIST } from '@utils/categoryConfig'

const PRESET_ICONS = ['📚', '💻', '🎨', '🎵', '🏃', '🧮', '🔬', '🌍', '📝', '🎮', '🍳', '📷', '✏️', '🎭', '🧠', '💡']
const PRESET_COLORS = ['#00d4ff', '#3b82f6', '#a855f7', '#ef4444', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#f97316']

export default function AreaForm({ area, onSave, onClose }) {
  const [name, setName]       = useState(area?.name ?? '')
  const [icon, setIcon]       = useState(area?.icon ?? '📚')
  const [color, setColor]     = useState(area?.color ?? '#00d4ff')
  const [category, setCategory] = useState(area?.category ?? 'intelligence')

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), icon, color, category })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{area ? 'Edit Area' : 'New Learning Area'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="area-form">
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              className="form-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Coding, Music, History…"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Icon</label>
            <div className="icon-grid">
              {PRESET_ICONS.map(em => (
                <button
                  key={em}
                  type="button"
                  className={`icon-option${icon === em ? ' icon-option--active' : ''}`}
                  onClick={() => setIcon(em)}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Color</label>
            <div className="color-grid">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`color-swatch${color === c ? ' color-swatch--active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">XP Category</label>
            <select
              className="form-select"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {CATEGORY_LIST.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={!name.trim()}>
              {area ? 'Save Changes' : 'Create Area'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
