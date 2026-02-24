import { useState } from 'react'
import { toDateString, isToday } from '@utils/dateUtils'
import { getCategoryColor } from '@utils/categoryConfig'
import CalendarDayModal from './CalendarDayModal'
import '@styles/pages/calendar.css'

export default function CalendarDay({ date, tasks, habitStatuses, appointments, isCurrentMonth }) {
  const [open, setOpen] = useState(false)
  const dateStr = toDateString(date)
  const today   = isToday(dateStr)

  const visibleTasks = tasks.slice(0, 2)
  const moreCount    = tasks.length + appointments.length - 2

  return (
    <>
      <div
        className={[
          'calendar-day',
          !isCurrentMonth ? 'calendar-day--other-month' : '',
          today ? 'calendar-day--today' : '',
        ].filter(Boolean).join(' ')}
        onClick={() => setOpen(true)}
      >
        <div className="calendar-day__number">{date.getDate()}</div>

        {/* Appointment color bars */}
        {appointments.slice(0, 2).map(a => (
          <div
            key={a.id}
            className="calendar-appt-bar"
            style={{ background: a.color }}
            title={a.title}
          >
            <span className="calendar-appt-bar__title">{a.title}</span>
          </div>
        ))}

        {/* Task + habit dot indicators */}
        <div className="calendar-day__dots">
          {visibleTasks.map(t => (
            <div
              key={t.id}
              className={`calendar-dot calendar-dot--task-${t.priority}`}
              title={t.title}
            />
          ))}
          {moreCount > 0 && (
            <div className="calendar-dot calendar-dot--more">+{moreCount}</div>
          )}
          {habitStatuses.slice(0, 3).map(h => (
            <div
              key={h.habitId}
              className={`calendar-dot calendar-dot--habit-${h.completed ? 'done' : 'miss'}`}
              style={h.completed ? { background: getCategoryColor(h.category) } : {}}
              title={h.name}
            />
          ))}
        </div>
      </div>

      {open && (
        <CalendarDayModal
          date={date}
          dateStr={dateStr}
          tasks={tasks}
          habitStatuses={habitStatuses}
          appointments={appointments}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
