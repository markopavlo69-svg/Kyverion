import GlowCard from '@components/ui/GlowCard'
import IconButton from '@components/ui/IconButton'
import { CategoryBadge } from '@components/ui/Badge'
import StreakBadge from './StreakBadge'
import { getCategoryColor, getCategoryName } from '@utils/categoryConfig'
import { getTodayString, getLastNDays } from '@utils/dateUtils'
import '@styles/pages/habits.css'

export default function HabitCard({ habit, onComplete, onDelete, onEdit }) {
  const today = getTodayString()
  const isCompletedToday = habit.completions.some(c => c.date === today)
  const completedDates   = new Set(habit.completions.map(c => c.date))
  const last7            = getLastNDays(today, 7)
  const catColor         = getCategoryColor(habit.category)
  const catName          = getCategoryName(habit.category)

  return (
    <GlowCard className="habit-card" interactive={!isCompletedToday}>
      {/* Icon */}
      <div
        className="habit-card__icon"
        style={{
          background: `color-mix(in srgb, ${catColor} 14%, transparent)`,
          borderColor: `color-mix(in srgb, ${catColor} 35%, transparent)`,
          color: catColor,
        }}
      >
        🎯
      </div>

      {/* Content */}
      <div className="habit-card__content">
        <div className="habit-card__name">{habit.name}</div>
        <div className="habit-card__meta">
          <CategoryBadge categoryId={habit.category} name={catName} color={catColor} />
          <StreakBadge streak={habit.currentStreak} />
          {/* 7-day mini dots */}
          <div className="habit-dots">
            {last7.map((d, i) => (
              <div
                key={d}
                className={`habit-dot${completedDates.has(d) ? ' habit-dot--done' : ''}${i === 6 ? ' habit-dot--today' : ''}`}
                style={{ '--dot-color': catColor }}
                title={d}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="habit-card__right">
        <div className="habit-card__actions">
          <IconButton variant="edit" onClick={() => onEdit(habit)} title="Edit habit">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </IconButton>
          <IconButton variant="danger" onClick={() => onDelete(habit.id)} title="Delete habit">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 3.5h10M5 3.5V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1M11 3.5L10 12a.5.5 0 01-.5.5h-5A.5.5 0 014 12L3 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </IconButton>
        </div>

        {/* Complete button */}
        <button
          className={`habit-complete-btn habit-complete-btn--${isCompletedToday ? 'done' : 'pending'}`}
          onClick={() => !isCompletedToday && onComplete(habit.id)}
          disabled={isCompletedToday}
          title={isCompletedToday ? 'Done for today!' : 'Mark complete'}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </GlowCard>
  )
}
