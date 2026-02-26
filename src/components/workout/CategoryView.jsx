import { useState } from 'react'
import { useWorkout } from '@context/WorkoutContext'
import WorkoutCard from './WorkoutCard'
import WorkoutForm from './WorkoutForm'
import BaselineManager from './BaselineManager'

const CATEGORY_LABELS = { calisthenics: 'Calisthenics', gym: 'Gym', other: 'Other' }
const CATEGORY_ICONS  = { calisthenics: '🤸', gym: '🏋️', other: '💪' }
const CATEGORY_COLORS = { calisthenics: 'strength', gym: 'discipline', other: 'vitality' }

export default function CategoryView({ category }) {
  const { getSessionsForCategory } = useWorkout()
  const [showForm,      setShowForm]      = useState(false)
  const [showBaselines, setShowBaselines] = useState(false)
  const [lastResult,    setLastResult]    = useState(null)

  const sessions = getSessionsForCategory(category)
  const catColor = CATEGORY_COLORS[category]

  const handleSaved = (result) => {
    setLastResult(result)
    setTimeout(() => setLastResult(null), 4000)
  }

  return (
    <div className="category-view">
      <div className={`category-view__header category-view__header--${catColor}`}>
        <div className="category-view__title-row">
          <span className="category-view__icon">{CATEGORY_ICONS[category]}</span>
          <h2 className="category-view__title">{CATEGORY_LABELS[category]}</h2>
          <span className="category-view__count">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="category-view__actions">
          <button className="btn btn--ghost btn--sm" onClick={() => setShowBaselines(true)}>
            📊 Baselines
          </button>
          <button className={`btn btn--primary btn--sm btn--cat-${catColor}`} onClick={() => setShowForm(true)}>
            + Log Workout
          </button>
        </div>
      </div>

      {/* PR banner after logging */}
      {lastResult?.newPRs?.length > 0 && (
        <div className="category-view__pr-banner">
          🏆 New PR{lastResult.newPRs.length > 1 ? 's' : ''}! <strong>{lastResult.newPRs.join(', ')}</strong>
          {' '}+{lastResult.xpAwarded} XP earned
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="empty-section">
          <div className="empty-icon">{CATEGORY_ICONS[category]}</div>
          <p className="empty-title">No {CATEGORY_LABELS[category]} sessions yet</p>
          <p className="empty-desc">Log your first workout to start tracking progress.</p>
          <button className={`btn btn--primary btn--cat-${catColor}`} onClick={() => setShowForm(true)}>
            Log First Workout
          </button>
        </div>
      ) : (
        <div className="category-view__sessions">
          {sessions.map(s => <WorkoutCard key={s.id} session={s} />)}
        </div>
      )}

      {showForm && (
        <WorkoutForm
          initialCategory={category}
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}

      {showBaselines && (
        <BaselineManager onClose={() => setShowBaselines(false)} />
      )}
    </div>
  )
}
