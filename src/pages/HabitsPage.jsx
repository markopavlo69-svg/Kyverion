import { useState, useMemo } from 'react'
import { useHabits } from '@context/HabitContext'
import HabitList from '@components/habits/HabitList'
import HabitForm from '@components/habits/HabitForm'
import Button from '@components/ui/Button'
import { getTodayString } from '@utils/dateUtils'
import '@styles/pages/habits.css'

export default function HabitsPage() {
  const { habits, addHabit, updateHabit, deleteHabit, completeHabitToday } = useHabits()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)

  const today   = getTodayString()
  const doneToday  = useMemo(() => habits.filter(h => h.completions.some(c => c.date === today)).length, [habits, today])
  const totalActive = habits.length
  const topStreak   = useMemo(() => Math.max(0, ...habits.map(h => h.currentStreak)), [habits])

  const handleEdit  = (habit) => { setEditing(habit); setShowForm(true) }
  const handleClose = () => { setShowForm(false); setEditing(null) }

  const handleSubmit = (formData) => {
    if (editing) {
      updateHabit(editing.id, { name: formData.name, description: formData.description, category: formData.category })
    } else {
      addHabit(formData)
    }
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Habits</h1>
        <Button
          variant="primary"
          onClick={() => { setEditing(null); setShowForm(true) }}
          icon={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          }
        >
          Add Habit
        </Button>
      </div>

      {/* Summary stats */}
      <div className="habits-summary">
        <div className="stat-card">
          <div className="stat-card__value stat-card__value--gold">{doneToday}/{totalActive}</div>
          <div className="stat-card__label">Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{totalActive}</div>
          <div className="stat-card__label">Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value" style={{ color: '#f87171' }}>{topStreak}d</div>
          <div className="stat-card__label">Best Streak</div>
        </div>
      </div>

      <HabitList
        habits={habits}
        onComplete={completeHabitToday}
        onDelete={deleteHabit}
        onEdit={handleEdit}
      />

      {showForm && (
        <HabitForm
          initialData={editing}
          onSubmit={handleSubmit}
          onClose={handleClose}
        />
      )}
    </>
  )
}
