import { useState } from 'react'
import GlowCard from '@components/ui/GlowCard'
import IconButton from '@components/ui/IconButton'
import { CategoryBadge } from '@components/ui/Badge'
import StreakBadge from './StreakBadge'
import { getCategoryColor, getCategoryName } from '@utils/categoryConfig'
import { getTodayString, getLastNDays, getLastNWeeks, getISOWeekKey } from '@utils/dateUtils'
import { HABIT_MASTERY_THRESHOLD } from '@utils/xpCalculator'
import '@styles/pages/habits.css'

export default function HabitCard({ habit, onComplete, onDelete, onEdit }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const today        = getTodayString()
  const isWeekly     = habit.frequency === 'weekly'
  const catColor     = getCategoryColor(habit.category)
  const catName      = getCategoryName(habit.category)
  const isMastered   = (habit.longestStreak ?? 0) >= HABIT_MASTERY_THRESHOLD

  // Completion check
  const isCompletedToday = isWeekly
    ? habit.completions.some(c => getISOWeekKey(c.date) === getISOWeekKey(today))
    : habit.completions.some(c => c.date === today)

  // Dots: 7 days for daily, 4 weeks for weekly
  const completedDates = new Set(habit.completions.map(c => c.date))
  const completedWeeks = new Set(habit.completions.map(c => getISOWeekKey(c.date)))

  const dots = isWeekly
    ? getLastNWeeks(today, 4).map((wk, i) => ({
        key:   wk,
        done:  completedWeeks.has(wk),
        today: i === 3,
      }))
    : getLastNDays(today, 7).map((d, i) => ({
        key:   d,
        done:  completedDates.has(d),
        today: i === 6,
      }))

  return (
    <GlowCard
      className={`habit-card${isMastered ? ' habit-card--mastered' : ''}`}
      interactive={!isCompletedToday}
    >
      {/* Icon */}
      <div
        className="habit-card__icon"
        style={{
          background: isMastered
            ? 'rgba(245, 158, 11, 0.12)'
            : `color-mix(in srgb, ${catColor} 14%, transparent)`,
          borderColor: isMastered
            ? 'rgba(245, 158, 11, 0.35)'
            : `color-mix(in srgb, ${catColor} 35%, transparent)`,
          color: isMastered ? 'var(--accent-gold)' : catColor,
        }}
      >
        {isMastered ? '♛' : '🎯'}
      </div>

      {/* Content */}
      <div className="habit-card__content">
        <div className="habit-card__name">{habit.name}</div>
        <div className="habit-card__meta">
          <CategoryBadge categoryId={habit.category} name={catName} color={catColor} />
          {isWeekly && <span className="habit-freq-badge">Weekly</span>}
          <StreakBadge streak={habit.currentStreak} mastered={isMastered} />
          {/* Dots: 7 days or 4 weeks */}
          <div className="habit-dots">
            {dots.map(({ key, done, today: isToday }) => (
              <div
                key={key}
                className={`habit-dot${done ? ' habit-dot--done' : ''}${isToday ? ' habit-dot--today' : ''}`}
                style={{ '--dot-color': isMastered ? 'var(--accent-gold)' : catColor }}
                title={key}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="habit-card__right">
        <div className="habit-card__actions">
          {confirmDelete ? (
            <div className="habit-card__confirm">
              <span className="habit-card__confirm-label">Delete?</span>
              <button className="habit-card__confirm-yes" onClick={() => onDelete(habit.id)}>Yes</button>
              <button className="habit-card__confirm-no" onClick={() => setConfirmDelete(false)}>No</button>
            </div>
          ) : (
            <>
              <IconButton variant="edit" onClick={() => onEdit(habit)} title="Edit habit">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </IconButton>
              <IconButton variant="danger" onClick={() => setConfirmDelete(true)} title="Delete habit">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 3.5h10M5 3.5V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1M11 3.5L10 12a.5.5 0 01-.5.5h-5A.5.5 0 014 12L3 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </IconButton>
            </>
          )}
        </div>

        {/* Complete button */}
        <button
          className={`habit-complete-btn habit-complete-btn--${isCompletedToday ? 'done' : 'pending'}${isMastered ? ' habit-complete-btn--mastered' : ''}`}
          onClick={() => !isCompletedToday && onComplete(habit.id)}
          disabled={isCompletedToday}
          title={isCompletedToday
            ? (isWeekly ? 'Done for this week!' : 'Done for today!')
            : isMastered ? 'Maintain your habit' : 'Mark complete'}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </GlowCard>
  )
}
