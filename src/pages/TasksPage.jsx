import { useState, useMemo } from 'react'
import { useTasks } from '@context/TaskContext'
import TaskList from '@components/tasks/TaskList'
import TaskForm from '@components/tasks/TaskForm'
import TaskFilters from '@components/tasks/TaskFilters'
import TaskStats from '@components/tasks/TaskStats'
import Button from '@components/ui/Button'
import { getTodayString, isTaskCompletedForDate } from '@utils/dateUtils'
import '@styles/pages/tasks.css'

const DEFAULT_FILTERS = { status: 'all', priority: 'all', category: 'all' }

export default function TasksPage() {
  const { tasks, addTask, updateTask, deleteTask, completeTask, uncompleteTask } = useTasks()
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState(null)
  const [filters, setFilters]     = useState(DEFAULT_FILTERS)
  const today = getTodayString()

  const handleFilterChange = (key, value) => setFilters(prev => ({ ...prev, [key]: value }))

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      const completedToday = isTaskCompletedForDate(t, today)
      if (filters.status === 'active' && completedToday)  return false
      if (filters.status === 'done'   && !completedToday) return false
      if (filters.priority !== 'all'  && t.priority !== filters.priority) return false
      if (filters.category !== 'all'  && !t.categories.includes(filters.category)) return false
      return true
    })
  }, [tasks, filters, today])

  const handleEdit  = (task) => { setEditing(task); setShowForm(true) }
  const handleClose = () => { setShowForm(false); setEditing(null) }

  const handleSubmit = (formData) => {
    if (editing) {
      updateTask(editing.id, formData)
    } else {
      addTask(formData)
    }
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Tasks</h1>
        <Button
          variant="primary"
          onClick={() => { setEditing(null); setShowForm(true) }}
          icon={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          }
        >
          Add Task
        </Button>
      </div>

      <TaskStats tasks={tasks} />
      <TaskFilters filters={filters} onFilterChange={handleFilterChange} />
      <TaskList
        tasks={filtered}
        dateStr={today}
        onComplete={completeTask}
        onUncomplete={uncompleteTask}
        onDelete={deleteTask}
        onEdit={handleEdit}
      />

      {showForm && (
        <TaskForm
          initialData={editing}
          onSubmit={handleSubmit}
          onClose={handleClose}
        />
      )}
    </>
  )
}
