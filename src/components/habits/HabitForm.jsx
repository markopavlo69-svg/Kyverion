import { useState } from 'react'
import Modal from '@components/ui/Modal'
import Button from '@components/ui/Button'
import { CATEGORY_LIST } from '@utils/categoryConfig'

const DEFAULT_FORM = { name: '', description: '', category: '', frequency: 'daily' }

export default function HabitForm({ initialData, onSubmit, onClose }) {
  const [form, setForm] = useState(() =>
    initialData
      ? {
          name:        initialData.name,
          description: initialData.description,
          category:    initialData.category,
          frequency:   initialData.frequency ?? 'daily',
        }
      : DEFAULT_FORM
  )
  const [errors, setErrors] = useState({})

  const set = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'Habit name is required'
    if (!form.category)    errs.category = 'Select a category'
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    onSubmit(form)
    onClose()
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={initialData ? 'Edit Habit' : 'New Habit'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit}>
            {initialData ? 'Save Changes' : 'Create Habit'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        {/* Name */}
        <div className="form-group">
          <label className="form-label">Habit Name *</label>
          <input
            type="text"
            placeholder="e.g. Morning workout"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            autoFocus
          />
          {errors.name && <span className="form-hint" style={{ color: '#f87171' }}>{errors.name}</span>}
        </div>

        {/* Description */}
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            placeholder="Optional — any notes about this habit..."
            value={form.description}
            onChange={e => set('description', e.target.value)}
            rows={2}
          />
        </div>

        {/* Frequency */}
        <div className="form-group">
          <label className="form-label">Frequency</label>
          <div className="freq-toggle">
            <button
              type="button"
              className={`freq-btn${form.frequency === 'daily' ? ' freq-btn--active' : ''}`}
              onClick={() => set('frequency', 'daily')}
            >
              Daily
            </button>
            <button
              type="button"
              className={`freq-btn${form.frequency !== 'daily' ? ' freq-btn--active' : ''}`}
              onClick={() => { if (form.frequency === 'daily') set('frequency', '1x') }}
            >
              Weekly
            </button>
          </div>

          {/* Times-per-week picker — visible when Weekly is selected */}
          {form.frequency !== 'daily' && (() => {
            const cur = form.frequency === 'weekly' ? 1 : (parseInt(form.frequency) || 1)
            return (
              <div className="freq-times-row">
                <span className="freq-times-label">×/week:</span>
                {[1, 2, 3, 4, 5, 6, 7].map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`freq-times-btn${cur === n ? ' freq-times-btn--active' : ''}`}
                    onClick={() => set('frequency', `${n}x`)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )
          })()}

          <span className="form-hint">
            {form.frequency === 'daily'
              ? 'Complete once per day — streak counts in days.'
              : (() => {
                  const n = form.frequency === 'weekly' ? 1 : (parseInt(form.frequency) || 1)
                  return n === 1
                    ? 'Complete once per week — streak counts in weeks.'
                    : `Complete ${n}× per week — streak advances when weekly target is hit.`
                })()}
          </span>
        </div>

        {/* Category */}
        <div className="form-group">
          <label className="form-label">Category *</label>
          <div className="category-grid">
            {CATEGORY_LIST.map(cat => (
              <label
                key={cat.id}
                className={`category-checkbox${form.category === cat.id ? ' category-checkbox--selected' : ''}`}
                style={{ '--cat-color': cat.color }}
              >
                <input
                  type="radio"
                  name="habit-category"
                  value={cat.id}
                  checked={form.category === cat.id}
                  onChange={() => set('category', cat.id)}
                />
                {cat.icon} {cat.name}
              </label>
            ))}
          </div>
          {errors.category && <span className="form-hint" style={{ color: '#f87171' }}>{errors.category}</span>}
        </div>
      </form>
    </Modal>
  )
}
