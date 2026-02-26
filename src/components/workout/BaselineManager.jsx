import { useState } from 'react'
import { useWorkout } from '@context/WorkoutContext'

function BaselineRow({ exerciseName, baseline, pr, onEdit, onDelete }) {
  const hasPR       = pr && pr.weight > 0
  const hasBaseline = baseline && (baseline.weight > 0 || baseline.reps > 0)
  const improvement = hasBaseline && hasPR && baseline.weight > 0
    ? (((pr.weight - baseline.weight) / baseline.weight) * 100).toFixed(1)
    : null

  return (
    <div className="baseline-row">
      <div className="baseline-row__name">{exerciseName}</div>
      <div className="baseline-row__data">
        {hasBaseline ? (
          <span className="baseline-row__val">
            {baseline.weight ? `${baseline.weight} ${baseline.unit}` : ''}
            {baseline.weight && baseline.reps ? ' × ' : ''}
            {baseline.reps ? `${baseline.reps} reps` : ''}
          </span>
        ) : (
          <span className="baseline-row__empty">—</span>
        )}
      </div>
      <div className="baseline-row__pr">
        {hasPR ? (
          <span className="baseline-row__val baseline-row__val--pr">
            {pr.weight} {pr.unit} × {pr.reps} reps
          </span>
        ) : (
          <span className="baseline-row__empty">—</span>
        )}
      </div>
      <div className="baseline-row__progress">
        {improvement !== null ? (
          <span className={`baseline-row__delta${parseFloat(improvement) >= 0 ? ' baseline-row__delta--pos' : ' baseline-row__delta--neg'}`}>
            {parseFloat(improvement) >= 0 ? '+' : ''}{improvement}%
          </span>
        ) : null}
      </div>
      <div className="baseline-row__actions">
        <button className="btn btn--ghost btn--xs" onClick={onEdit}>
          {hasBaseline ? 'Edit' : 'Set'}
        </button>
        {hasBaseline && (
          <button className="btn btn--ghost btn--xs btn--danger" onClick={onDelete}>✕</button>
        )}
      </div>
    </div>
  )
}

function BaselineEditForm({ exerciseName, existing, onSave, onCancel }) {
  const [weight, setWeight] = useState(existing?.weight ?? '')
  const [reps,   setReps]   = useState(existing?.reps ?? '')
  const [unit,   setUnit]   = useState(existing?.unit ?? 'kg')
  const [notes,  setNotes]  = useState(existing?.notes ?? '')

  const handleSave = () => {
    if (!weight && !reps) return
    onSave(exerciseName, parseInt(reps, 10) || null, parseFloat(weight) || null, unit, notes)
  }

  return (
    <div className="baseline-edit">
      <div className="baseline-edit__title">Set baseline for <strong>{exerciseName}</strong></div>
      <div className="baseline-edit__fields">
        <div className="form-group">
          <label className="form-label">Weight</label>
          <input className="form-input" type="number" min="0" step="0.5" value={weight}
            onChange={e => setWeight(e.target.value)} placeholder="0" />
        </div>
        <div className="form-group">
          <label className="form-label">Unit</label>
          <select className="form-select" value={unit} onChange={e => setUnit(e.target.value)}>
            <option value="kg">kg</option>
            <option value="lbs">lbs</option>
            <option value="bw">BW</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Reps</label>
          <input className="form-input" type="number" min="0" value={reps}
            onChange={e => setReps(e.target.value)} placeholder="0" />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Notes (optional)</label>
        <input className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. starting weight at gym" />
      </div>
      <div className="form-actions">
        <button className="btn btn--ghost btn--sm" onClick={onCancel}>Cancel</button>
        <button className="btn btn--primary btn--sm" onClick={handleSave}>Save Baseline</button>
      </div>
    </div>
  )
}

export default function BaselineManager({ onClose }) {
  const { allExerciseNames, baselines, prs, setBaseline, deleteBaseline } = useWorkout()
  const [editing, setEditing] = useState(null)  // exercise name being edited
  const [newName, setNewName] = useState('')

  const handleSave = (name, reps, weight, unit, notes) => {
    setBaseline(name, reps, weight, unit, notes)
    setEditing(null)
    setNewName('')
  }

  const exercisesWithData = [...new Set([
    ...allExerciseNames,
    ...Object.keys(baselines),
  ])].sort()

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="baseline-manager modal-box modal-box--lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Baselines & Progress</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <p className="baseline-manager__desc">
          Set a starting point for each exercise. Compare your baseline to your current personal record.
        </p>

        {/* Header row */}
        {exercisesWithData.length > 0 && (
          <div className="baseline-header-row">
            <span>Exercise</span>
            <span>Baseline</span>
            <span>Current PR</span>
            <span>Progress</span>
            <span></span>
          </div>
        )}

        <div className="baseline-list">
          {exercisesWithData.length === 0 ? (
            <div className="empty-section empty-section--center">
              <div className="empty-icon">🏋️</div>
              <p>Log some workouts first, then set baselines here.</p>
            </div>
          ) : (
            exercisesWithData.map(name => (
              <div key={name}>
                {editing === name ? (
                  <BaselineEditForm
                    exerciseName={name}
                    existing={baselines[name]}
                    onSave={handleSave}
                    onCancel={() => setEditing(null)}
                  />
                ) : (
                  <BaselineRow
                    exerciseName={name}
                    baseline={baselines[name]}
                    pr={prs[name]}
                    onEdit={() => setEditing(name)}
                    onDelete={() => deleteBaseline(name)}
                  />
                )}
              </div>
            ))
          )}
        </div>

        {/* Add baseline for exercise not yet logged */}
        <div className="baseline-manager__add">
          <input
            className="form-input"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Add baseline for new exercise…"
            list="exercise-suggestions-baseline"
          />
          {newName.trim() && !editing && (
            <button className="btn btn--primary btn--sm" onClick={() => setEditing(newName.trim())}>
              Set Baseline
            </button>
          )}
        </div>

        <datalist id="exercise-suggestions-baseline">
          {allExerciseNames.map(n => <option key={n} value={n} />)}
        </datalist>
      </div>
    </div>
  )
}
