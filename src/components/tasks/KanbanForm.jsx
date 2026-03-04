import { useState, useRef } from 'react'
import { X } from 'lucide-react'
import { CATEGORY_LIST, getCategoryColor } from '@utils/categoryConfig'

const COLUMNS = [
  { id: 'backlog',     label: 'Backlog' },
  { id: 'todo',        label: 'To Do' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'done',        label: 'Done' },
]

const PRIORITIES = ['low', 'medium', 'high', 'urgent']

const DEFAULT_FORM = {
  title:       '',
  description: '',
  status:      'todo',
  priority:    'medium',
  categories:  [],
  dueDate:     '',
  recurrence:  'none',
  tags:        [],
}

function toFormData(task) {
  if (!task) return DEFAULT_FORM
  return {
    title:       task.title ?? '',
    description: task.description ?? '',
    status:      task.status ?? 'todo',
    priority:    task.priority ?? 'medium',
    categories:  task.categories ?? [],
    dueDate:     task.dueDate ?? '',
    recurrence:  task.recurrence?.type ?? 'none',
    tags:        task.tags ?? [],
  }
}

export function KanbanForm({ initialData, defaultStatus, onSubmit }) {
  const [form, setForm] = useState(() => ({
    ...toFormData(initialData),
    status: initialData?.status ?? defaultStatus ?? 'todo',
  }))
  const [tagInput, setTagInput] = useState('')
  const [errors, setErrors]     = useState({})
  const tagInputRef = useRef(null)

  function setField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }))
  }

  function toggleCategory(catId) {
    setForm(prev => {
      const current = prev.categories
      const next = current.includes(catId)
        ? current.filter(id => id !== catId)
        : [...current, catId]
      return { ...prev, categories: next }
    })
    if (errors.categories) setErrors(prev => ({ ...prev, categories: null }))
  }

  function handleTagKeyDown(e) {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      const tag = tagInput.trim().replace(/,/g, '')
      if (tag && !form.tags.includes(tag)) {
        setField('tags', [...form.tags, tag])
      }
      setTagInput('')
    }
    if (e.key === 'Backspace' && !tagInput && form.tags.length > 0) {
      setField('tags', form.tags.slice(0, -1))
    }
  }

  function removeTag(tag) {
    setField('tags', form.tags.filter(t => t !== tag))
  }

  function validate() {
    const errs = {}
    if (!form.title.trim()) errs.title = 'Title is required'
    if (form.categories.length === 0) errs.categories = 'Select at least one category'
    return errs
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    onSubmit({
      title:       form.title.trim(),
      description: form.description.trim() || '',
      status:      form.status,
      priority:    form.priority,
      categories:  form.categories,
      dueDate:     form.dueDate || null,
      recurrence:  form.recurrence === 'none' ? { type: 'none' } : { type: form.recurrence },
      tags:        form.tags,
    })
  }

  return (
    <form id="kanban-form" className="k-form" onSubmit={handleSubmit}>
      {/* Title */}
      <div className="k-form__field">
        <label htmlFor="kf-title">Title *</label>
        <input
          id="kf-title"
          type="text"
          value={form.title}
          onChange={e => setField('title', e.target.value)}
          placeholder="What needs to be done?"
          autoFocus
        />
        {errors.title && <span className="k-form__error">{errors.title}</span>}
      </div>

      {/* Description */}
      <div className="k-form__field">
        <label htmlFor="kf-desc">Description</label>
        <textarea
          id="kf-desc"
          value={form.description}
          onChange={e => setField('description', e.target.value)}
          placeholder="Optional details…"
          rows={2}
        />
      </div>

      {/* Status + Due Date */}
      <div className="k-form__row">
        <div className="k-form__field">
          <label htmlFor="kf-status">Column</label>
          <select id="kf-status" value={form.status} onChange={e => setField('status', e.target.value)}>
            {COLUMNS.map(col => (
              <option key={col.id} value={col.id}>{col.label}</option>
            ))}
          </select>
        </div>
        <div className="k-form__field">
          <label htmlFor="kf-due">Due Date</label>
          <input
            id="kf-due"
            type="date"
            value={form.dueDate}
            onChange={e => setField('dueDate', e.target.value)}
          />
        </div>
      </div>

      {/* Priority */}
      <div className="k-form__field">
        <label>Priority</label>
        <div className="k-priority-group">
          {PRIORITIES.map(p => (
            <label key={p} className={`k-priority-radio k-priority-radio--${p}`}>
              <input
                type="radio"
                name="priority"
                value={p}
                checked={form.priority === p}
                onChange={() => setField('priority', p)}
              />
              <span className="k-priority-radio__label">
                <span className="k-priority-radio__dot" />
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="k-form__field">
        <label>Categories *</label>
        <div className="k-category-grid">
          {CATEGORY_LIST.map(cat => {
            const selected = form.categories.includes(cat.id)
            const color    = getCategoryColor(cat.id)
            return (
              <button
                key={cat.id}
                type="button"
                className={`k-cat-btn${selected ? ' k-cat-btn--selected' : ''}`}
                style={{ '--cat-color': color }}
                onClick={() => toggleCategory(cat.id)}
              >
                <span>{cat.icon}</span>
                {cat.name}
              </button>
            )
          })}
        </div>
        {errors.categories && <span className="k-form__error">{errors.categories}</span>}
      </div>

      {/* Recurrence */}
      <div className="k-form__field">
        <label htmlFor="kf-recur">Repeat</label>
        <select id="kf-recur" value={form.recurrence} onChange={e => setField('recurrence', e.target.value)}>
          <option value="none">No repeat</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="biweekly">Bi-weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      {/* Tags */}
      <div className="k-form__field">
        <label>Tags</label>
        <div className="k-tags-wrapper" onClick={() => tagInputRef.current?.focus()}>
          {form.tags.map(tag => (
            <span key={tag} className="k-tag-chip">
              {tag}
              <button type="button" className="k-tag-chip__remove" onClick={() => removeTag(tag)}>
                <X size={10} />
              </button>
            </span>
          ))}
          <input
            ref={tagInputRef}
            className="k-tags-input"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder={form.tags.length === 0 ? 'Add tags…' : ''}
          />
        </div>
        <span className="k-form__hint">Press Enter or comma to add a tag</span>
      </div>

      {/* Hidden submit */}
      <button type="submit" style={{ display: 'none' }} />
    </form>
  )
}
