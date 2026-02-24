import { useState } from 'react'
import Modal from '@components/ui/Modal'
import Button from '@components/ui/Button'
import { CATEGORY_LIST } from '@utils/categoryConfig'

const DEFAULT_FORM = { name: '', description: '', category: '' }

export default function HabitForm({ initialData, onSubmit, onClose }) {
  const [form, setForm] = useState(() =>
    initialData
      ? { name: initialData.name, description: initialData.description, category: initialData.category }
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

        {/* Frequency info */}
        <p className="form-hint">⏱ Frequency: Daily (other options coming in Phase 2)</p>
      </form>
    </Modal>
  )
}
