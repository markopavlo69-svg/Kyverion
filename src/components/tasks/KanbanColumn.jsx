import { Plus, Archive, Circle, Loader2, CheckCircle2, Inbox } from 'lucide-react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { KanbanCard } from './KanbanCard'

const COLUMN_ICONS = {
  backlog:       <Archive size={14} />,
  todo:          <Circle size={14} />,
  'in-progress': <Loader2 size={14} />,
  done:          <CheckCircle2 size={14} />,
}

const COLUMN_COLORS = {
  backlog:       'var(--text-muted)',
  todo:          'var(--accent-purple)',
  'in-progress': 'var(--accent-pink)',
  done:          'var(--accent-teal)',
}

export function KanbanColumn({ column, tasks, onEdit, onDelete, onAddTask }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  const taskIds = tasks.map(t => t.id)
  const isDone  = column.id === 'done'

  return (
    <div className={`kanban-column kanban-column--${column.id}`}>
      <div className="kanban-column__header">
        <span className="kanban-column__icon" style={{ color: COLUMN_COLORS[column.id] }}>
          {COLUMN_ICONS[column.id]}
        </span>
        <h3 className="kanban-column__title">{column.label}</h3>
        <span className="kanban-column__count">{tasks.length}</span>
        <button
          className="kanban-column__add-btn"
          onClick={() => onAddTask(column.id)}
          title={`Add task to ${column.label}`}
        >
          <Plus size={13} />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={`kanban-column__body${isOver ? ' kanban-column__body--over' : ''}`}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div className="kanban-column__empty">
              <Inbox size={20} />
              <span>Drop tasks here</span>
            </div>
          ) : (
            tasks.map(task => (
              <KanbanCard
                key={task.id}
                task={task}
                onEdit={onEdit}
                onDelete={onDelete}
                isDoneColumn={isDone}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  )
}
