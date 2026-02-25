import { useEffect, useRef, useCallback } from 'react'
import { useTasks } from '@context/TaskContext'
import { useHabits } from '@context/HabitContext'
import { useAppointments } from '@context/AppointmentContext'
import { getTodayString, isOverdue, isTaskCompletedForDate } from '@utils/dateUtils'

const APPT_WARN_MINUTES = 60 // notify 60 min before appointment

function requestPermission() {
  if (!('Notification' in window)) return
  if (Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

function notify(title, body, icon) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, icon: icon ?? '/favicon.ico', silent: false })
  } catch {
    // Some browsers block non-HTTPS notifications — ignore silently
  }
}

export function useNotifications() {
  const { tasks }        = useTasks()
  const { habits }       = useHabits()
  const { appointments } = useAppointments()

  const notifiedRef = useRef(new Set()) // track already-fired notification keys this session

  // Request permission on mount
  useEffect(() => { requestPermission() }, [])

  const runChecks = useCallback(() => {
    const today = getTodayString()
    const now   = new Date()
    const hour  = now.getHours()

    // ── 1. Unfinished habits — remind after 20:00 ─────────────────────────────
    if (hour >= 20) {
      const pendingHabits = habits.filter(h => {
        if (h.completions.some(c => c.date === today)) return false
        return true
      })
      if (pendingHabits.length > 0) {
        const key = `habits_${today}`
        if (!notifiedRef.current.has(key)) {
          notifiedRef.current.add(key)
          notify(
            `${pendingHabits.length} habit${pendingHabits.length > 1 ? 's' : ''} still pending`,
            pendingHabits.map(h => h.name).slice(0, 3).join(', ') + (pendingHabits.length > 3 ? '…' : ''),
          )
        }
      }
    }

    // ── 2. Overdue tasks ──────────────────────────────────────────────────────
    const overdueTasks = tasks.filter(t => {
      if (t.recurrence?.type && t.recurrence.type !== 'none') return false
      return isOverdue(t.dueDate) && !isTaskCompletedForDate(t, today)
    })
    if (overdueTasks.length > 0) {
      const key = `overdue_${today}`
      if (!notifiedRef.current.has(key)) {
        notifiedRef.current.add(key)
        notify(
          `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`,
          overdueTasks.map(t => t.title).slice(0, 3).join(', ') + (overdueTasks.length > 3 ? '…' : ''),
        )
      }
    }

    // ── 3. Appointments within the next hour ──────────────────────────────────
    for (const appt of appointments) {
      if (appt.date !== today || !appt.time) continue
      const [h, m] = appt.time.split(':').map(Number)
      const apptMs  = new Date(today + 'T' + appt.time + ':00').getTime()
      const diffMin = Math.round((apptMs - now.getTime()) / 60000)
      if (diffMin > 0 && diffMin <= APPT_WARN_MINUTES) {
        const key = `appt_${appt.id}_${today}`
        if (!notifiedRef.current.has(key)) {
          notifiedRef.current.add(key)
          notify(
            `Upcoming: ${appt.title}`,
            `In ${diffMin} min${appt.location ? ` · ${appt.location}` : ''}`,
          )
        }
      }
    }
  }, [tasks, habits, appointments])

  // Check on mount and every 5 minutes
  useEffect(() => {
    runChecks()
    const id = setInterval(runChecks, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [runChecks])
}
