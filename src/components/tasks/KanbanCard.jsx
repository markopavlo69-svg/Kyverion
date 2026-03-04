import { GripVertical, Pencil, Trash2, Clock, RefreshCw } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { isOverdue, formatDue } from '@utils/dateUtils'
import { getCategoryColor, getCategoryName } from '@utils/categoryConfig'

function PriorityBadge({ priority }) {
  const labels = { low: 'Low', medium: 'Med', high: 'High', urgent: '!! Urgent' }
  return (
    <span className={`k-badge k-badge--priority k-badge--${priority}`}>
      {labels[priority] ?? priority}
    </span>
  )
}

function CategoryBadge({ categoryId }) {
  const color = getCategoryColor(categoryId)
  const name  = getCategoryName(categoryId)
  return (
    <span className="k-badge k-badge--category" style={{ color, border: `1px solid ${color}28` }}>
      <span className="k-badge__dot" style={{ background: color }} />
      {name}
    </span>
  )
}

function RecurringBadge({ type }) {
  const labels = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', biweekly: 'Bi-weekly', yearly: 'Yearly' }
  return (
    <span className="k-badge k-badge--recurring">
      <RefreshCw size={9} />
      {labels[type] ?? type}
    </span>
  )
}

export function KanbanCard({ task, onEdit, onDelete, isDoneColumn }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'Task', task },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const overdue  = isOverdue(task.dueDate)
  const dueLabel = formatDue(task.dueDate)
  const isRecurring = task.recurrence && task.recurrence.type !== 'none'

  const cardClass = [
    'k-card',
    `k-card--${task.priority}`,
    isDragging   ? 'k-card--dragging' : '',
    isDoneColumn ? 'k-card--done'     : '',
  ].filter(Boolean).join(' ')

  return (
    <div ref={setNodeRef} style={style} className={cardClass} {...attributes} {...listeners}>
      <div className="k-card__grip">
        <GripVertical size={13} />
      </div>

      <div className="k-card__body">
        <div className="k-card__title">{task.title}</div>
        <div className="k-card__meta">
          <PriorityBadge priority={task.priority} />
          {(task.categories ?? []).slice(0, 2).map(catId => (
            <CategoryBadge key={catId} categoryId={catId} />
          ))}
          {isRecurring && <RecurringBadge type={task.recurrence.type} />}
          {dueLabel && (
            <span className={`k-card__due${overdue ? ' k-card__due--overdue' : dueLabel === 'Today' ? ' k-card__due--today' : ''}`}>
              <Clock size={9} />
              {dueLabel}
            </span>
          )}
        </div>
      </div>

      <div className="k-card__actions">
        <button
          className="k-card__btn"
          title="Edit task"
          onClick={e => { e.stopPropagation(); onEdit(task) }}
        >
          <Pencil size={12} />
        </button>
        <button
          className="k-card__btn k-card__btn--danger"
          title="Delete task"
          onClick={e => { e.stopPropagation(); onDelete(task.id) }}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

// Ghost card shown in DragOverlay
export function KanbanCardOverlay({ task }) {
  const isRecurring = task.recurrence && task.recurrence.type !== 'none'
  return (
    <div className={`k-card k-card--${task.priority} k-card--overlay`}>
      <div className="k-card__grip">
        <GripVertical size={13} />
      </div>
      <div className="k-card__body">
        <div className="k-card__title">{task.title}</div>
        <div className="k-card__meta">
          <span className={`k-badge k-badge--priority k-badge--${task.priority}`}>
            {task.priority}
          </span>
          {(task.categories ?? []).slice(0, 1).map(catId => {
            const color = getCategoryColor(catId)
            const name  = getCategoryName(catId)
            return (
              <span key={catId} className="k-badge k-badge--category" style={{ color, border: `1px solid ${color}28` }}>
                <span className="k-badge__dot" style={{ background: color }} />
                {name}
              </span>
            )
          })}
          {isRecurring && (
            <span className="k-badge k-badge--recurring">
              <RefreshCw size={9} />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
