export function getTodayString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export function toDateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

export function offsetDate(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return toDateString(d)
}

export function isToday(dateStr) {
  return dateStr === getTodayString()
}

export function isOverdue(dateStr) {
  if (!dateStr) return false
  return dateStr < getTodayString()
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateShort(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function getLastNDays(dateStr, n) {
  const result = []
  for (let i = n - 1; i >= 0; i--) {
    result.push(offsetDate(dateStr, -i))
  }
  return result
}

export function getMonthDays(year, month) {
  const days = []
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)

  // Leading days from prev month
  const startDow = firstDay.getDay() // 0 = Sunday
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    days.push({ date: d, isCurrentMonth: false })
  }

  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month, d), isCurrentMonth: true })
  }

  // Trailing days (always fill to 42 = 6 rows)
  const trailing = 42 - days.length
  for (let d = 1; d <= trailing; d++) {
    days.push({ date: new Date(year, month + 1, d), isCurrentMonth: false })
  }

  return days
}

export function getMonthName(month) {
  return [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ][month]
}

export const WEEKDAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

// Returns true if a task (recurring or one-off) falls on the given date string
export function doesTaskRecurOn(task, dateStr) {
  const { dueDate, recurrence } = task
  if (!dueDate) return false
  if (!recurrence || recurrence.type === 'none') return dueDate === dateStr
  if (dateStr < dueDate) return false
  const start  = new Date(dueDate  + 'T00:00:00')
  const target = new Date(dateStr  + 'T00:00:00')
  const diffDays = Math.round((target - start) / (1000 * 60 * 60 * 24))
  switch (recurrence.type) {
    case 'daily':    return true
    case 'weekly':   return diffDays % 7  === 0
    case 'biweekly': return diffDays % 14 === 0
    case 'monthly':  return target.getDate() === start.getDate()
    case 'yearly':   return target.getDate() === start.getDate() && target.getMonth() === start.getMonth()
    case 'custom':   return (recurrence.daysOfWeek ?? []).includes(target.getDay())
    default: return false
  }
}

// Returns ISO week key "YYYY-Www" for a date string (Mon=start of week)
export function getISOWeekKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  // Shift to Thursday to correctly compute ISO year
  const day = d.getDay() || 7 // 1=Mon … 7=Sun
  d.setDate(d.getDate() + 4 - day)
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`
}

// Returns last N ISO week keys (oldest first), ending at the week containing dateStr
export function getLastNWeeks(dateStr, n) {
  const results = []
  for (let i = n - 1; i >= 0; i--) {
    results.push(getISOWeekKey(offsetDate(dateStr, -i * 7)))
  }
  return results
}

// Returns true if a task is marked complete for the given date
export function isTaskCompletedForDate(task, dateStr) {
  if (!task.recurrence || task.recurrence.type === 'none') return !!task.completed
  return (task.completedDates ?? []).includes(dateStr)
}

// Formats "HH:MM" → "H:MM AM/PM"
export function formatTime(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour  = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}
