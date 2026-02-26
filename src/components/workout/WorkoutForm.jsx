import { useState } from 'react'
import { useWorkout } from '@context/WorkoutContext'

const CATEGORY_LABELS = { calisthenics: 'Calisthenics', gym: 'Gym', other: 'Other' }

function todayKey() { return new Date().toISOString().slice(0, 10) }

function defaultTitle(category) {
  const now   = new Date()
  const month = now.toLocaleString('en-US', { month: 'short' })
  const day   = now.getDate()
  return `${CATEGORY_LABELS[category]} — ${month} ${day}`
}

const EMPTY_SET = { reps: '', weight: '', unit: 'kg' }

function emptyExercise() {
  return { localId: String(Date.now() + Math.random()), name: '', sets: [{ ...EMPTY_SET }] }
}

export default function WorkoutForm({ initialCategory, onClose, onSaved }) {
  const { allExerciseNames, addSession } = useWorkout()

  const [category, setCategory] = useState(initialCategory || 'gym')
  const [title,    setTitle]    = useState(() => defaultTitle(initialCategory || 'gym'))
  const [date,     setDate]     = useState(todayKey)
  const [notes,    setNotes]    = useState('')
  const [exercises, setExercises] = useState([emptyExercise()])
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  const handleCategoryChange = (cat) => {
    setCategory(cat)
    setTitle(defaultTitle(cat))
  }

  // ── Exercise helpers ─────────────────────────────────────────────────────
  const updateExerciseName = (localId, name) =>
    setExercises(prev => prev.map(e => e.localId === localId ? { ...e, name } : e))

  const updateSet = (localId, setIdx, field, value) =>
    setExercises(prev => prev.map(e => {
      if (e.localId !== localId) return e
      const sets = e.sets.map((s, i) => i === setIdx ? { ...s, [field]: value } : s)
      return { ...e, sets }
    }))

  const addSet = (localId) =>
    setExercises(prev => prev.map(e =>
      e.localId === localId ? { ...e, sets: [...e.sets, { ...EMPTY_SET }] } : e
    ))

  const removeSet = (localId, setIdx) =>
    setExercises(prev => prev.map(e => {
      if (e.localId !== localId) return e
      if (e.sets.length <= 1) return e
      return { ...e, sets: e.sets.filter((_, i) => i !== setIdx) }
    }))

  const addExercise = () => setExercises(prev => [...prev, emptyExercise()])

  const removeExercise = (localId) =>
    setExercises(prev => {
      if (prev.length <= 1) return prev
      return prev.filter(e => e.localId !== localId)
    })

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setError('')
    const validExercises = exercises.filter(e => e.name.trim())
    if (validExercises.length === 0) {
      setError('Add at least one exercise with a name.')
      return
    }
    setSaving(true)
    try {
      const result = await addSession(
        category,
        title.trim() || defaultTitle(category),
        notes.trim(),
        date,
        validExercises.map(e => ({
          name: e.name.trim(),
          sets: e.sets.filter(s => s.reps || s.weight).map(s => ({
            reps:   parseInt(s.reps, 10) || 0,
            weight: parseFloat(s.weight) || 0,
            unit:   s.unit || 'kg',
          })),
        }))
      )
      onSaved?.(result)
      onClose?.()
    } catch (err) {
      setError('Failed to save. Please try again.')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="workout-form modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Log Workout</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* ── Category ── */}
        <div className="workout-form__category-row">
          {['calisthenics', 'gym', 'other'].map(cat => (
            <button
              key={cat}
              className={`workout-cat-btn${category === cat ? ` workout-cat-btn--${cat} workout-cat-btn--active` : ''}`}
              onClick={() => handleCategoryChange(cat)}
            >
              {cat === 'calisthenics' ? '🤸' : cat === 'gym' ? '🏋️' : '💪'}
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* ── Title + Date ── */}
        <div className="workout-form__row workout-form__row--2">
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              className="form-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Session name"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input
              className="form-input"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
        </div>

        {/* ── Exercises ── */}
        <div className="workout-form__exercises">
          <div className="workout-form__section-header">
            <span className="workout-form__section-title">Exercises</span>
          </div>

          {exercises.map((ex, exIdx) => (
            <div key={ex.localId} className="workout-form__exercise">
              <div className="workout-form__exercise-header">
                <input
                  className="form-input workout-form__exercise-name"
                  value={ex.name}
                  onChange={e => updateExerciseName(ex.localId, e.target.value)}
                  placeholder={`Exercise ${exIdx + 1}`}
                  list="exercise-suggestions"
                />
                {exercises.length > 1 && (
                  <button className="icon-btn icon-btn--danger" onClick={() => removeExercise(ex.localId)} title="Remove exercise">✕</button>
                )}
              </div>

              <table className="workout-form__sets-table">
                <thead>
                  <tr>
                    <th>Set</th>
                    <th>Reps</th>
                    <th>Weight</th>
                    <th>Unit</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {ex.sets.map((set, si) => (
                    <tr key={si}>
                      <td className="workout-form__set-num">{si + 1}</td>
                      <td>
                        <input
                          className="form-input workout-form__set-input"
                          type="number"
                          min="0"
                          value={set.reps}
                          onChange={e => updateSet(ex.localId, si, 'reps', e.target.value)}
                          placeholder="—"
                        />
                      </td>
                      <td>
                        <input
                          className="form-input workout-form__set-input"
                          type="number"
                          min="0"
                          step="0.5"
                          value={set.weight}
                          onChange={e => updateSet(ex.localId, si, 'weight', e.target.value)}
                          placeholder="—"
                        />
                      </td>
                      <td>
                        <select
                          className="form-select workout-form__set-unit"
                          value={set.unit}
                          onChange={e => updateSet(ex.localId, si, 'unit', e.target.value)}
                        >
                          <option value="kg">kg</option>
                          <option value="lbs">lbs</option>
                          <option value="bw">BW</option>
                        </select>
                      </td>
                      <td>
                        {ex.sets.length > 1 && (
                          <button className="icon-btn icon-btn--danger icon-btn--xs" onClick={() => removeSet(ex.localId, si)} title="Remove set">✕</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button className="btn btn--ghost btn--sm" onClick={() => addSet(ex.localId)}>
                + Add Set
              </button>
            </div>
          ))}

          <button className="workout-form__add-exercise-btn" onClick={addExercise}>
            + Add Exercise
          </button>
        </div>

        {/* ── Notes ── */}
        <div className="form-group">
          <label className="form-label">Notes (optional)</label>
          <textarea
            className="form-input workout-form__notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="How did it go? Any observations…"
            rows={2}
          />
        </div>

        {error && <p className="workout-form__error">{error}</p>}

        <div className="form-actions">
          <button className="btn btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Workout'}
          </button>
        </div>

        <datalist id="exercise-suggestions">
          {allExerciseNames.map(name => <option key={name} value={name} />)}
        </datalist>
      </div>
    </div>
  )
}
