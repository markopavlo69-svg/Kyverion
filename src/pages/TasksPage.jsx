import { useState, useRef } from 'react'
import { Plus } from 'lucide-react'
import { FilterProvider } from '@context/FilterContext'
import { useTasks } from '@context/TaskContext'
import { KanbanBoard } from '@components/tasks/KanbanBoard'
import { KanbanFilterBar } from '@components/tasks/KanbanFilterBar'
import { KanbanProgressPanel } from '@components/tasks/KanbanProgressPanel'
import { KanbanForm } from '@components/tasks/KanbanForm'
import Modal from '@components/ui/Modal'
import Button from '@components/ui/Button'
import '@styles/pages/tasks-kanban.css'

function TasksKanban() {
  const { addTask, updateTask } = useTasks()
  const [modalOpen, setModalOpen]   = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [defaultStatus, setDefaultStatus] = useState('todo')

  function openCreate(status = 'todo') {
    setEditingTask(null)
    setDefaultStatus(status)
    setModalOpen(true)
  }

  function openEdit(task) {
    setEditingTask(task)
    setDefaultStatus(task.status)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingTask(null)
  }

  function handleSubmit(data) {
    if (editingTask) {
      updateTask(editingTask.id, data)
    } else {
      addTask(data)
    }
    closeModal()
  }

  return (
    <div className="kanban-page">
      {/* Header */}
      <div className="kanban-page__header">
        <h1 className="kanban-page__title">Tasks</h1>
        <Button
          variant="primary"
          onClick={() => openCreate('todo')}
          icon={<Plus size={14} />}
        >
          New Task
        </Button>
      </div>

      {/* Stats + Filters */}
      <KanbanProgressPanel />
      <KanbanFilterBar />

      {/* Board */}
      <KanbanBoard
        onAddTask={openCreate}
        onEditTask={openEdit}
      />

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingTask ? 'Edit Task' : 'New Task'}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                const form = document.getElementById('kanban-form')
                if (form) form.requestSubmit()
              }}
            >
              {editingTask ? 'Save Changes' : 'Create Task'}
            </Button>
          </>
        }
      >
        <KanbanForm
          key={editingTask?.id ?? 'new'}
          initialData={editingTask}
          defaultStatus={defaultStatus}
          onSubmit={handleSubmit}
        />
      </Modal>
    </div>
  )
}

export default function TasksPage() {
  return (
    <FilterProvider>
      <TasksKanban />
    </FilterProvider>
  )
}
