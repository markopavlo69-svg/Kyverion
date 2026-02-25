import { useState } from 'react'
import { PriorityBadge, CategoryBadge } from '@components/ui/Badge'
import IconButton from '@components/ui/IconButton'
import GlowCard from '@components/ui/GlowCard'
import { formatDateShort, isOverdue, getTodayString, isTaskCompletedForDate } from '@utils/dateUtils'
import { getCategoryColor, getCategoryName } from '@utils/categoryConfig'

const RECUR_LABELS = {
  daily:    'Daily',
  weekly:   'Weekly',
  biweekly: 'Biweekly',
  monthly:  'Monthly',
  yearly:   'Yearly',
  custom:   'Custom',
}

export default function TaskCard({ task, dateStr, onComplete, onUncomplete, onDelete, onEdit }) {
  const [showDesc,      setShowDesc]      = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const today = dateStr || getTodayString()

  const isRecurring  = task.recurrence && task.recurrence.type !== 'none'
  const isCompleted  = isTaskCompletedForDate(task, today)
  const overdue      = !isRecurring && !isCompleted && isOverdue(task.dueDate)
  const cardVariant  = isCompleted ? 'completed' : overdue ? 'danger' : 'default'

  return (
    <GlowCard
      className={`task-card task-card--${task.priority}`}
      variant={cardVariant}
      interactive={!isCompleted}
    >
      {/* Checkbox */}
      <button
        className={`task-card__check${isCompleted ? ' task-card__check--done' : ''}`}
        onClick={() => isCompleted ? onUncomplete(task.id, today) : onComplete(task.id, today)}
        title={isCompleted ? 'Mark incomplete' : 'Complete task'}
      >
        {isCompleted && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="task-card__content">
        <div className="task-card__header">
          <span
            className={`task-card__title${isCompleted ? ' task-card__title--done' : ''}`}
            onClick={() => task.description && setShowDesc(s => !s)}
          >
            {task.title}
          </span>
          <div className="task-card__actions">
            {confirmDelete ? (
              <div className="task-card__confirm">
                <span className="task-card__confirm-label">Delete?</span>
                <button className="task-card__confirm-yes" onClick={() => onDelete(task.id)}>Yes</button>
                <button className="task-card__confirm-no" onClick={() => setConfirmDelete(false)}>No</button>
              </div>
            ) : (
              <>
                <IconButton variant="edit" onClick={() => onEdit(task)} title="Edit task">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </IconButton>
                <IconButton variant="danger" onClick={() => setConfirmDelete(true)} title="Delete task">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 3.5h10M5 3.5V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1M11 3.5L10 12a.5.5 0 01-.5.5h-5A.5.5 0 014 12L3 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </IconButton>
              </>
            )}
          </div>
        </div>

        <div className="task-card__meta">
          <PriorityBadge priority={task.priority} />
          {task.categories.map(catId => (
            <CategoryBadge
              key={catId}
              categoryId={catId}
              name={getCategoryName(catId)}
              color={getCategoryColor(catId)}
            />
          ))}
          {isRecurring && (
            <span className="task-card__recur">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 5a3.5 3.5 0 106-2.5M7.5 1v1.5H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {RECUR_LABELS[task.recurrence.type] || 'Recurring'}
            </span>
          )}
          {task.dueDate && !isRecurring && (
            <span className={`task-card__due${overdue ? ' task-card__due--overdue' : ''}`}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M5.5 3v2.5l1.5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              {overdue ? 'Overdue · ' : ''}{formatDateShort(task.dueDate)}
            </span>
          )}
          {task.dueDate && isRecurring && (
            <span className="task-card__due">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M5.5 3v2.5l1.5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              From {formatDateShort(task.dueDate)}
            </span>
          )}
        </div>

        {showDesc && task.description && (
          <p className="task-card__description">{task.description}</p>
        )}
      </div>
    </GlowCard>
  )
}
