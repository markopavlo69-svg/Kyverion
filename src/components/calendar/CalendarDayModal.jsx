import { useState } from 'react'
import Modal from '@components/ui/Modal'
import Button from '@components/ui/Button'
import { useTasks } from '@context/TaskContext'
import { useHabits } from '@context/HabitContext'
import { useAppointments } from '@context/AppointmentContext'
import { getCategoryColor } from '@utils/categoryConfig'
import { formatDate, formatTime, isTaskCompletedForDate } from '@utils/dateUtils'
import AppointmentForm from './AppointmentForm'
import '@styles/pages/calendar.css'

export default function CalendarDayModal({ date, dateStr, tasks, habitStatuses, appointments, onClose }) {
  const { completeTask, uncompleteTask }   = useTasks()
  const { completeHabitToday }             = useHabits()
  const { addAppointment, deleteAppointment } = useAppointments()
  const [showApptForm, setShowApptForm]    = useState(false)
  const isToday = dateStr === new Date().toISOString().split('T')[0]

  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        title={formatDate(dateStr)}
        className="cal-day-modal"
        footer={
          <Button
            variant="ghost"
            onClick={() => setShowApptForm(true)}
            icon={
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            }
          >
            Add Appointment
          </Button>
        }
      >
        {/* Appointments section */}
        {appointments.length > 0 && (
          <div className="cal-section">
            <div className="cal-section-title">Appointments</div>
            {appointments.map(a => (
              <div key={a.id} className="cal-appt-item" style={{ '--appt-color': a.color }}>
                <div className="cal-appt-item__color" style={{ background: a.color }} />
                <div className="cal-appt-item__body">
                  <div className="cal-appt-item__title">{a.title}</div>
                  {(a.time || a.location) && (
                    <div className="cal-appt-item__meta">
                      {a.time && (
                        <span>
                          {formatTime(a.time)}
                          {a.endTime ? ` – ${formatTime(a.endTime)}` : ''}
                        </span>
                      )}
                      {a.location && <span>· {a.location}</span>}
                    </div>
                  )}
                </div>
                <button
                  className="cal-appt-item__delete"
                  onClick={() => deleteAppointment(a.id)}
                  title="Delete appointment"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tasks section */}
        <div className="cal-section">
          <div className="cal-section-title">Tasks</div>
          {tasks.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No tasks this day.</p>
          ) : tasks.map(t => {
            const done = isTaskCompletedForDate(t, dateStr)
            return (
              <div key={t.id} className="cal-task-item">
                <div
                  className={`cal-task-item__check${done ? ' cal-task-item__check--done' : ''}`}
                  onClick={() => done ? uncompleteTask(t.id, dateStr) : completeTask(t.id, dateStr)}
                  title={done ? 'Mark incomplete' : 'Complete task'}
                >
                  {done && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5L8 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div className="cal-task-item__body">
                  <span className={`cal-task-item__title${done ? ' cal-task-item__title--done' : ''}`}>
                    {t.title}
                  </span>
                  {t.recurrence && t.recurrence.type !== 'none' && (
                    <span className="cal-task-item__recur">↻</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Habits section */}
        <div className="cal-section">
          <div className="cal-section-title">Habits</div>
          {habitStatuses.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No habits tracked.</p>
          ) : habitStatuses.map(h => (
            <div key={h.habitId} className="cal-habit-item">
              <div
                className="cal-habit-indicator"
                style={{ background: h.completed ? getCategoryColor(h.category) : 'var(--border-dim)' }}
              />
              <span className="cal-habit-item__name">{h.name}</span>
              <span className={`cal-habit-status${h.completed ? ' cal-habit-status--done' : ''}`}>
                {h.completed ? '✓ Done' : (isToday ? '○ Pending' : '✗ Missed')}
              </span>
              {isToday && !h.completed && (
                <button
                  style={{
                    marginLeft: '8px',
                    background: 'rgba(16,185,129,0.1)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#34d399',
                    fontSize: 'var(--text-xs)',
                    padding: '2px 8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                  onClick={() => completeHabitToday(h.habitId)}
                >
                  Done
                </button>
              )}
            </div>
          ))}
        </div>
      </Modal>

      {showApptForm && (
        <AppointmentForm
          initialDate={dateStr}
          onSubmit={addAppointment}
          onClose={() => setShowApptForm(false)}
        />
      )}
    </>
  )
}
