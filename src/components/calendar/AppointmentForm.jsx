import { useState } from 'react'
import Modal from '@components/ui/Modal'
import Button from '@components/ui/Button'

const COLORS = [
  { value: '#00d4ff', label: 'Teal'   },
  { value: '#a855f7', label: 'Purple' },
  { value: '#f59e0b', label: 'Gold'   },
  { value: '#10b981', label: 'Green'  },
  { value: '#ef4444', label: 'Red'    },
  { value: '#3b82f6', label: 'Blue'   },
]

const DEFAULT_FORM = {
  title:       '',
  description: '',
  date:        '',
  time:        '',
  endTime:     '',
  location:    '',
  color:       '#00d4ff',
}

export default function AppointmentForm({ initialDate, initialData, onSubmit, onClose }) {
  const [form, setForm] = useState(() => {
    if (initialData) {
      return {
        title:       initialData.title,
        description: initialData.description,
        date:        initialData.date,
        time:        initialData.time,
        endTime:     initialData.endTime,
        location:    initialData.location,
        color:       initialData.color,
      }
    }
    return { ...DEFAULT_FORM, date: initialDate || '' }
  })
  const [errors, setErrors] = useState({})

  const set = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.title.trim()) errs.title = 'Title is required'
    if (!form.date)         errs.date  = 'Date is required'
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    onSubmit(form)
    onClose()
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={initialData ? 'Edit Appointment' : 'New Appointment'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit}>
            {initialData ? 'Save Changes' : 'Create Appointment'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label className="form-label">Title *</label>
          <input
            type="text"
            placeholder="Appointment title"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            autoFocus
          />
          {errors.title && <span className="form-hint" style={{ color: '#f87171' }}>{errors.title}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Date *</label>
          <input
            type="date"
            value={form.date}
            onChange={e => set('date', e.target.value)}
          />
          {errors.date && <span className="form-hint" style={{ color: '#f87171' }}>{errors.date}</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label">Start Time</label>
            <input
              type="time"
              value={form.time}
              onChange={e => set('time', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">End Time</label>
            <input
              type="time"
              value={form.endTime}
              onChange={e => set('endTime', e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Location</label>
          <input
            type="text"
            placeholder="Optional location"
            value={form.location}
            onChange={e => set('location', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            placeholder="Optional notes..."
            value={form.description}
            onChange={e => set('description', e.target.value)}
            rows={2}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Color</label>
          <div className="appt-color-picker">
            {COLORS.map(c => (
              <button
                key={c.value}
                type="button"
                className={`appt-color-swatch${form.color === c.value ? ' appt-color-swatch--selected' : ''}`}
                style={{ '--swatch-color': c.value }}
                onClick={() => set('color', c.value)}
                title={c.label}
              />
            ))}
          </div>
        </div>
      </form>
    </Modal>
  )
}
