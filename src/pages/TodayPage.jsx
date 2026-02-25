import { useTasks } from '@context/TaskContext'
import { useHabits } from '@context/HabitContext'
import { useAppointments } from '@context/AppointmentContext'
import { useLearning } from '@context/LearningContext'
import { getTodayString, isOverdue, isTaskCompletedForDate, formatDateShort } from '@utils/dateUtils'
import { getCategoryColor, getCategoryName } from '@utils/categoryConfig'
import { PriorityBadge } from '@components/ui/Badge'
import '@styles/pages/today.css'

function TodaySection({ title, icon, count, children, empty }) {
  return (
    <section className="today-section">
      <div className="today-section__header">
        <span className="today-section__icon">{icon}</span>
        <h2 className="today-section__title">{title}</h2>
        {count > 0 && <span className="today-section__count">{count}</span>}
      </div>
      {count === 0 ? (
        <p className="today-empty">{empty}</p>
      ) : (
        <div className="today-section__content">{children}</div>
      )}
    </section>
  )
}

export default function TodayPage({ onNavigate }) {
  const { tasks, getTasksByDate, completeTask, uncompleteTask } = useTasks()
  const { habits, completeHabitToday }    = useHabits()
  const { getAppointmentsByDate }         = useAppointments()
  const { activeSession, areas }          = useLearning()

  const today = getTodayString()
  const now   = new Date()

  // ── Tasks ────────────────────────────────────────────────────
  const todayTasks = getTasksByDate(today)
  const pendingTasks = todayTasks.filter(t => !isTaskCompletedForDate(t, today))
  const overdueTasks = tasks.filter(t => {
    if (!t.dueDate || t.recurrence?.type !== 'none' && t.recurrence) return false
    return isOverdue(t.dueDate) && !isTaskCompletedForDate(t, today)
  })
  // Merge and deduplicate overdue + today's pending
  const allPendingIds = new Set(pendingTasks.map(t => t.id))
  const uniqueOverdue = overdueTasks.filter(t => !allPendingIds.has(t.id))
  const focusTasks = [...pendingTasks, ...uniqueOverdue]

  // ── Habits ───────────────────────────────────────────────────
  const pendingHabits = habits.filter(h => !h.completions.some(c => c.date === today))

  // ── Appointments ─────────────────────────────────────────────
  const todayAppts = getAppointmentsByDate(today).sort((a, b) => {
    if (!a.time) return 1
    if (!b.time) return -1
    return a.time.localeCompare(b.time)
  })

  // ── Learning ─────────────────────────────────────────────────
  const activeArea = activeSession ? areas.find(a => a.id === activeSession.areaId) : null

  return (
    <div className="today-page">
      <div className="today-page__date">
        {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>

      {/* Active learning session banner */}
      {activeSession && activeArea && (
        <div className="today-active-session" onClick={() => onNavigate('learning')}>
          <span className="today-active-session__dot" />
          <span className="today-active-session__text">
            Learning session active — <strong>{activeArea.name}</strong>
          </span>
          <span className="today-active-session__cta">Open →</span>
        </div>
      )}

      <div className="today-grid">
        {/* Habits */}
        <TodaySection
          title="Habits"
          icon="🔥"
          count={pendingHabits.length}
          empty="All habits done for today!"
        >
          {pendingHabits.map(h => {
            const color = getCategoryColor(h.category)
            return (
              <div key={h.id} className="today-habit-row">
                <div className="today-habit-row__info">
                  <span className="today-habit-row__name">{h.name}</span>
                  <span className="today-habit-row__cat" style={{ color }}>
                    {getCategoryName(h.category)}
                  </span>
                </div>
                <button
                  className="today-habit-row__check"
                  onClick={() => completeHabitToday(h.id)}
                  title="Mark complete"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            )
          })}
        </TodaySection>

        {/* Tasks */}
        <TodaySection
          title="Tasks"
          icon="✓"
          count={focusTasks.length}
          empty="No pending tasks for today!"
        >
          {focusTasks.map(t => {
            const overdue = isOverdue(t.dueDate) && !getTasksByDate(today).find(x => x.id === t.id)
            return (
              <div key={t.id} className="today-task-row">
                <button
                  className="today-task-row__check"
                  onClick={() => completeTask(t.id, today)}
                  title="Complete"
                />
                <div className="today-task-row__info">
                  <span className="today-task-row__title">{t.title}</span>
                  <div className="today-task-row__meta">
                    <PriorityBadge priority={t.priority} />
                    {t.dueDate && (
                      <span className={`today-task-row__due${overdue ? ' today-task-row__due--overdue' : ''}`}>
                        {overdue ? 'Overdue · ' : ''}{formatDateShort(t.dueDate)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </TodaySection>

        {/* Appointments */}
        <TodaySection
          title="Schedule"
          icon="📅"
          count={todayAppts.length}
          empty="Nothing scheduled for today."
        >
          {todayAppts.map(a => (
            <div key={a.id} className="today-appt-row" style={{ '--appt-color': a.color }}>
              <div className="today-appt-row__dot" />
              <div className="today-appt-row__info">
                <span className="today-appt-row__title">{a.title}</span>
                {(a.time || a.location) && (
                  <span className="today-appt-row__meta">
                    {a.time && <span>{a.time}{a.endTime ? ` – ${a.endTime}` : ''}</span>}
                    {a.location && <span> · {a.location}</span>}
                  </span>
                )}
              </div>
            </div>
          ))}
        </TodaySection>
      </div>

      {/* Navigation shortcuts */}
      <div className="today-shortcuts">
        <button className="today-shortcut" onClick={() => onNavigate('tasks')}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          All Tasks
        </button>
        <button className="today-shortcut" onClick={() => onNavigate('habits')}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1.5C5.5 1.5 3.5 4 4.5 7c.4 1.3 1.8 2.2 1.8 4 0 .7.6 1.3 1.3 1.3s1.3-.6 1.3-1.3c0-1.8 1.3-2.7 1.8-4 1-3-.9-5.5-2.7-5.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          All Habits
        </button>
        <button className="today-shortcut" onClick={() => onNavigate('calendar')}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          Calendar
        </button>
        <button className="today-shortcut" onClick={() => onNavigate('learning')}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2L1.5 6l6.5 3.5L14.5 6 8 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            <path d="M1.5 10l6.5 3.5L14.5 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Learning
        </button>
      </div>
    </div>
  )
}
