import { useState } from 'react'
import { useTasks } from '@context/TaskContext'
import { useHabits } from '@context/HabitContext'
import { useAppointments } from '@context/AppointmentContext'
import CalendarDay from './CalendarDay'
import { getMonthDays, getMonthName, toDateString } from '@utils/dateUtils'
import '@styles/pages/calendar.css'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarView() {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const { getTasksByDate }           = useTasks()
  const { getAllHabitsStatusForDate } = useHabits()
  const { getAppointmentsByDate }    = useAppointments()

  const days = getMonthDays(year, month)

  const prev = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const next = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  return (
    <div>
      {/* Navigation */}
      <div className="calendar-nav">
        <button className="calendar-nav-btn" onClick={prev} title="Previous month">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span className="calendar-month-title">{getMonthName(month)} {year}</span>
        <button className="calendar-nav-btn" onClick={next} title="Next month">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Grid */}
      <div className="calendar-grid-container">
        <div className="calendar-weekdays">
          {WEEKDAYS.map(d => (
            <div key={d} className="calendar-weekday">{d}</div>
          ))}
        </div>
        <div className="calendar-grid">
          {days.map(({ date, isCurrentMonth }, i) => {
            const dateStr = toDateString(date)
            return (
              <CalendarDay
                key={`${dateStr}-${i}`}
                date={date}
                isCurrentMonth={isCurrentMonth}
                tasks={getTasksByDate(dateStr)}
                habitStatuses={getAllHabitsStatusForDate(dateStr)}
                appointments={getAppointmentsByDate(dateStr)}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
