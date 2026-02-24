import TaskCard from './TaskCard'
import EmptyState from '@components/ui/EmptyState'

export default function TaskList({ tasks, dateStr, onComplete, onUncomplete, onDelete, onEdit }) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect x="4" y="4" width="24" height="24" rx="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 16l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        }
        title="No tasks found"
        description="Add a task or adjust your filters to see results here."
      />
    )
  }

  return (
    <div className="task-list">
      {tasks.map((task, i) => (
        <div key={task.id} style={{ animationDelay: `${i * 0.04}s` }}>
          <TaskCard
            task={task}
            dateStr={dateStr}
            onComplete={onComplete}
            onUncomplete={onUncomplete}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        </div>
      ))}
    </div>
  )
}
