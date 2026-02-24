import { useState } from 'react'
import Modal from '@components/ui/Modal'
import Button from '@components/ui/Button'
import { CATEGORY_LIST } from '@utils/categoryConfig'
import { WEEKDAY_LABELS } from '@utils/dateUtils'
import '@styles/pages/tasks.css'

const RECURRENCE_OPTIONS = [
  { value: 'none',     label: 'Does not repeat' },
  { value: 'daily',    label: 'Every day' },
  { value: 'weekly',   label: 'Every week' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly',  label: 'Monthly (same day)' },
  { value: 'yearly',   label: 'Yearly (same date)' },
  { value: 'custom',   label: 'Custom days of week' },
]

const DEFAULT_FORM = {
  title:          '',
  description:    '',
  dueDate:        '',
  priority:       'medium',
  categories:     [],
  recurrenceType: 'none',
  recurrenceDays: [],
}

export default function TaskForm({ initialData, onSubmit, onClose }) {
  const [form, setForm] = useState(() => {
    if (!initialData) return DEFAULT_FORM
    const rec = initialData.recurrence ?? { type: 'none' }
    return {
      title:          initialData.title,
      description:    initialData.description,
      dueDate:        initialData.dueDate ?? '',
      priority:       initialData.priority,
      categories:     initialData.categories,
      recurrenceType: rec.type ?? 'none',
      recurrenceDays: rec.daysOfWeek ?? [],
    }
  })
  const [errors, setErrors] = useState({})

  const set = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }))
  }

  const toggleCategory = (catId) => {
    setForm(prev => ({
      ...prev,
      categories: prev.categories.includes(catId)
        ? prev.categories.filter(c => c !== catId)
        : [...prev.categories, catId],
    }))
  }

  const toggleDay = (dayIndex) => {
    setForm(prev => ({
      ...prev,
      recurrenceDays: prev.recurrenceDays.includes(dayIndex)
        ? prev.recurrenceDays.filter(d => d !== dayIndex)
        : [...prev.recurrenceDays, dayIndex],
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.title.trim()) errs.title = 'Title is required'
    if (form.categories.length === 0) errs.categories = 'Select at least one category'
    if (form.recurrenceType !== 'none' && !form.dueDate)
      errs.dueDate = 'Start date is required for recurring tasks'
    if (form.recurrenceType === 'custom' && form.recurrenceDays.length === 0)
      errs.recurrenceDays = 'Select at least one day'
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    const recurrence = form.recurrenceType === 'none'
      ? { type: 'none' }
      : form.recurrenceType === 'custom'
        ? { type: 'custom', daysOfWeek: form.recurrenceDays }
        : { type: form.recurrenceType }

    onSubmit({ ...form, recurrence })
    onClose()
  }

  const PRIORITIES = ['low', 'medium', 'high']
  const isRecurring = form.recurrenceType !== 'none'

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={initialData ? 'Edit Task' : 'New Task'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} type="submit">
            {initialData ? 'Save Changes' : 'Create Task'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        {/* Title */}
        <div className="form-group">
          <label className="form-label">Title *</label>
          <input
            type="text"
            placeholder="What needs to be done?"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            autoFocus
          />
          {errors.title && <span className="form-hint" style={{ color: '#f87171' }}>{errors.title}</span>}
        </div>

        {/* Description */}
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            placeholder="Optional details..."
            value={form.description}
            onChange={e => set('description', e.target.value)}
            rows={2}
          />
        </div>

        {/* Due / Start Date */}
        <div className="form-group">
          <label className="form-label">{isRecurring ? 'Start Date *' : 'Due Date'}</label>
          <input
            type="date"
            value={form.dueDate}
            onChange={e => set('dueDate', e.target.value)}
          />
          {errors.dueDate && <span className="form-hint" style={{ color: '#f87171' }}>{errors.dueDate}</span>}
        </div>

        {/* Recurrence */}
        <div className="form-group">
          <label className="form-label">Repeat</label>
          <select
            className="filter-select"
            style={{ width: '100%' }}
            value={form.recurrenceType}
            onChange={e => set('recurrenceType', e.target.value)}
          >
            {RECURRENCE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Custom day picker */}
        {form.recurrenceType === 'custom' && (
          <div className="form-group">
            <label className="form-label">Repeat on</label>
            <div className="day-picker">
              {WEEKDAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  className={`day-btn${form.recurrenceDays.includes(i) ? ' day-btn--selected' : ''}`}
                  onClick={() => toggleDay(i)}
                >
                  {label.slice(0, 2)}
                </button>
              ))}
            </div>
            {errors.recurrenceDays && (
              <span className="form-hint" style={{ color: '#f87171' }}>{errors.recurrenceDays}</span>
            )}
          </div>
        )}

        {/* Priority */}
        <div className="form-group">
          <label className="form-label">Priority</label>
          <div className="priority-group">
            {PRIORITIES.map(p => (
              <label
                key={p}
                className={`priority-option priority-option--${p}${form.priority === p ? ' priority-option--selected' : ''}`}
              >
                <input
                  type="radio"
                  name="priority"
                  value={p}
                  checked={form.priority === p}
                  onChange={() => set('priority', p)}
                />
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </label>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="form-group">
          <label className="form-label">Categories *</label>
          <div className="category-grid">
            {CATEGORY_LIST.map(cat => (
              <label
                key={cat.id}
                className={`category-checkbox${form.categories.includes(cat.id) ? ' category-checkbox--selected' : ''}`}
                style={{ '--cat-color': cat.color }}
              >
                <input
                  type="checkbox"
                  checked={form.categories.includes(cat.id)}
                  onChange={() => toggleCategory(cat.id)}
                />
                {cat.icon} {cat.name}
              </label>
            ))}
          </div>
          {errors.categories && (
            <span className="form-hint" style={{ color: '#f87171' }}>{errors.categories}</span>
          )}
        </div>
      </form>
    </Modal>
  )
}
