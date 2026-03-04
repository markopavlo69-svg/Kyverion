import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { KanbanColumn } from './KanbanColumn'
import { KanbanCardOverlay } from './KanbanCard'
import { useTasks } from '@context/TaskContext'
import { useTaskFilters } from '@hooks/useTaskFilters'

const COLUMNS = [
  { id: 'backlog',     label: 'Backlog' },
  { id: 'todo',        label: 'To Do' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'done',        label: 'Done' },
]

export { COLUMNS }

export function KanbanBoard({ onAddTask, onEditTask }) {
  const { tasks, deleteTask, moveTask, reorderColumn } = useTasks()
  const filteredTasks = useTaskFilters()
  const [activeTask, setActiveTask] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragStart({ active }) {
    const task = tasks.find(t => t.id === active.id)
    setActiveTask(task ?? null)
  }

  function handleDragOver({ active, over }) {
    if (!over || active.id === over.id) return

    const draggedTask = tasks.find(t => t.id === active.id)
    if (!draggedTask) return

    const fromColumn = draggedTask.status
    const overTask   = tasks.find(t => t.id === over.id)
    const toColumn   = overTask ? overTask.status : over.id

    if (fromColumn !== toColumn && COLUMNS.some(c => c.id === toColumn)) {
      moveTask(active.id, toColumn)
    }
  }

  function handleDragEnd({ active, over }) {
    setActiveTask(null)
    if (!over || active.id === over.id) return

    const draggedTask = tasks.find(t => t.id === active.id)
    const overTask    = tasks.find(t => t.id === over.id)

    if (!draggedTask || !overTask) return

    if (draggedTask.status === overTask.status) {
      reorderColumn(active.id, over.id)
    }
  }

  function handleDragCancel() {
    setActiveTask(null)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="kanban-board">
        {COLUMNS.map(column => {
          const columnTasks = filteredTasks.filter(t => t.status === column.id)
          return (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={columnTasks}
              onEdit={onEditTask}
              onDelete={deleteTask}
              onAddTask={onAddTask}
            />
          )
        })}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {activeTask ? <KanbanCardOverlay task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
