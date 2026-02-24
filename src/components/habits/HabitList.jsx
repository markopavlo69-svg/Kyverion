import HabitCard from './HabitCard'
import EmptyState from '@components/ui/EmptyState'

export default function HabitList({ habits, onComplete, onDelete, onEdit }) {
  if (habits.length === 0) {
    return (
      <EmptyState
        icon={
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M16 4C11 4 8 9 9.5 14c.8 2.5 3.5 4 3.5 7.5 0 1.4 1.3 2.5 2.5 2.5s2.5-1.1 2.5-2.5c0-3.5 2.7-5 3.5-7.5C23 9 20 4 16 4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        }
        title="No habits yet"
        description="Build winning streaks by adding daily habits."
      />
    )
  }

  return (
    <div className="habit-list">
      {habits.map((habit, i) => (
        <div key={habit.id} style={{ animationDelay: `${i * 0.04}s` }}>
          <HabitCard
            habit={habit}
            onComplete={onComplete}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        </div>
      ))}
    </div>
  )
}
