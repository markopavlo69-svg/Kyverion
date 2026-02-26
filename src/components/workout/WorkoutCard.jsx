import { useState } from 'react'
import { useWorkout } from '@context/WorkoutContext'

const CATEGORY_COLORS = { calisthenics: 'strength', gym: 'discipline', other: 'vitality' }
const CATEGORY_ICONS  = { calisthenics: '🤸', gym: '🏋️', other: '💪' }

export default function WorkoutCard({ session }) {
  const { deleteSession, prs } = useWorkout()
  const [expanded,      setExpanded]      = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const totalSets = session.exercises.reduce((s, ex) => s + (ex.sets?.length ?? 0), 0)
  const catColor  = CATEGORY_COLORS[session.category] || 'discipline'

  const formatDate = (d) => {
    const date = new Date(d + 'T00:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    if (confirmDelete) {
      deleteSession(session.id)
    } else {
      setConfirmDelete(true)
    }
  }

  return (
    <div className={`workout-card${expanded ? ' workout-card--expanded' : ''}`}>
      {/* ── Collapsed header ── */}
      <div className="workout-card__header" onClick={() => setExpanded(v => !v)}>
        <div className="workout-card__icon">
          {CATEGORY_ICONS[session.category]}
        </div>
        <div className="workout-card__info">
          <div className="workout-card__title">{session.title}</div>
          <div className="workout-card__meta">
            <span className={`badge badge--${catColor}`}>{session.category}</span>
            <span className="workout-card__date">{formatDate(session.date)}</span>
          </div>
        </div>
        <div className="workout-card__summary">
          {session.exercises.length > 0 && (
            <>
              <span className="workout-card__stat">{session.exercises.length} exercises</span>
              <span className="workout-card__stat">{totalSets} sets</span>
            </>
          )}
          {session.xpAwarded > 0 && (
            <span className="workout-card__xp">+{session.xpAwarded} XP</span>
          )}
        </div>
        <span className={`workout-card__chevron${expanded ? ' workout-card__chevron--open' : ''}`}>›</span>
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div className="workout-card__detail">
          {session.exercises.length === 0 ? (
            <p className="workout-card__empty">No exercises logged.</p>
          ) : (
            <div className="workout-card__exercises">
              {session.exercises.map(ex => {
                const prRecord = prs[ex.name]
                const sessionMax = Math.max(0, ...ex.sets.map(s => parseFloat(s.weight) || 0))
                const isPR = prRecord && prRecord.sessionId === session.id && sessionMax > 0
                return (
                  <div key={ex.id} className="workout-card__exercise">
                    <div className="workout-card__exercise-name">
                      {ex.name}
                      {isPR && <span className="workout-card__pr-badge">🏆 PR</span>}
                    </div>
                    {ex.sets.length > 0 && (
                      <table className="workout-card__sets-table">
                        <thead>
                          <tr><th>Set</th><th>Reps</th><th>Weight</th></tr>
                        </thead>
                        <tbody>
                          {ex.sets.map((s, i) => (
                            <tr key={i}>
                              <td>{i + 1}</td>
                              <td>{s.reps || '—'}</td>
                              <td>{s.weight ? `${s.weight} ${s.unit || 'kg'}` : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {session.notes && (
            <p className="workout-card__notes">{session.notes}</p>
          )}

          <div className="workout-card__actions">
            {confirmDelete ? (
              <>
                <span className="workout-card__confirm-text">Delete this session?</span>
                <button className="btn btn--danger btn--sm" onClick={handleDelete}>Delete</button>
                <button className="btn btn--ghost btn--sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
              </>
            ) : (
              <button className="btn btn--ghost btn--sm" onClick={handleDelete}>Delete</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
