import { useState } from 'react'
import GlowCard from '@components/ui/GlowCard'
import IconButton from '@components/ui/IconButton'
import { CategoryBadge } from '@components/ui/Badge'
import StreakBadge from './StreakBadge'
import { getCategoryColor, getCategoryName } from '@utils/categoryConfig'
import { getTodayString, getLastNDays, getLastNWeeks, getISOWeekKey } from '@utils/dateUtils'
import { HABIT_MASTERY_THRESHOLD } from '@utils/xpCalculator'
import '@styles/pages/habits.css'

// Local helper — mirrors getWeeklyTarget from HabitContext
function weeklyTarget(frequency) {
  if (!frequency || frequency === 'daily') return 0
  if (frequency === 'weekly') return 1
  const m = String(frequency).match(/^(\d+)x$/)
  return m ? parseInt(m[1], 10) : 1
}

export default function HabitCard({ habit, onComplete, onDelete, onEdit }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const today      = getTodayString()
  const isNxWeekly = habit.frequency !== 'daily'
  const wkTarget   = isNxWeekly ? weeklyTarget(habit.frequency) : 0
  const catColor   = getCategoryColor(habit.category)
  const catName    = getCategoryName(habit.category)
  const isMastered = (habit.longestStreak ?? 0) >= HABIT_MASTERY_THRESHOLD

  // Count completions for the current ISO-week
  const thisWeek     = getISOWeekKey(today)
  const thisWeekDone = isNxWeekly
    ? habit.completions.filter(c => getISOWeekKey(c.date) === thisWeek).length
    : 0
  const isWeeklyMet  = isNxWeekly && thisWeekDone >= wkTarget

  // The complete button is "done" when: today is already logged OR weekly target met
  const isDoneToday      = habit.completions.some(c => c.date === today)
  const isCompletedToday = isNxWeekly ? (isDoneToday || isWeeklyMet) : isDoneToday

  // Dots: 4 weeks for weekly habits (done = that week's count >= target), 7 days for daily
  const completedDates = new Set(habit.completions.map(c => c.date))
  const weekCounts     = {}
  for (const c of habit.completions) {
    const wk = getISOWeekKey(c.date)
    weekCounts[wk] = (weekCounts[wk] || 0) + 1
  }

  const dots = isNxWeekly
    ? getLastNWeeks(today, 4).map((wk, i) => ({
        key:   wk,
        done:  (weekCounts[wk] ?? 0) >= wkTarget,
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
          {isNxWeekly && (
            <span className="habit-freq-badge">
              {wkTarget === 1 ? 'Weekly' : `${wkTarget}×/wk`}
            </span>
          )}
          {isNxWeekly && wkTarget > 1 && (
            <span className={`habit-weekly-progress${isWeeklyMet ? ' habit-weekly-progress--done' : ''}`}>
              {thisWeekDone}/{wkTarget}
            </span>
          )}
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
          title={
            isWeeklyMet  ? `${wkTarget}/${wkTarget} done this week!` :
            isDoneToday  ? (isNxWeekly ? `${thisWeekDone}/${wkTarget} this week — come back tomorrow` : 'Done for today!') :
            isMastered   ? 'Maintain your habit' : 'Mark complete'
          }
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </GlowCard>
  )
}
