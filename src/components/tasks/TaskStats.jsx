import { useMemo } from 'react'
import { isOverdue, getTodayString, isTaskCompletedForDate } from '@utils/dateUtils'
import '@styles/pages/tasks.css'

export default function TaskStats({ tasks }) {
  const stats = useMemo(() => {
    const today   = getTodayString()
    const total   = tasks.length
    const done    = tasks.filter(t => isTaskCompletedForDate(t, today)).length
    const overdue = tasks.filter(t => {
      if (!t.recurrence || t.recurrence.type === 'none') {
        return !t.completed && isOverdue(t.dueDate)
      }
      return false // recurring tasks don't go overdue
    }).length
    return { total, done, overdue }
  }, [tasks])

  return (
    <div className="tasks-stats">
      <div className="stat-card">
        <div className="stat-card__value">{stats.total}</div>
        <div className="stat-card__label">Total</div>
      </div>
      <div className="stat-card">
        <div className="stat-card__value stat-card__value--gold">{stats.done}</div>
        <div className="stat-card__label">Done Today</div>
      </div>
      <div className="stat-card">
        <div className="stat-card__value stat-card__value--danger">{stats.overdue}</div>
        <div className="stat-card__label">Overdue</div>
      </div>
    </div>
  )
}
