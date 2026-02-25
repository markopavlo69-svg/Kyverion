// ============================================================
// Builds the AI context string injected into every system prompt.
// Gives the AI a snapshot of the user's current app state.
// ============================================================

import { levelFromXP } from './xpCalculator'
import { CATEGORIES }  from './categoryConfig'

function offsetDateStr(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * @param {Object} params
 * @param {Array}  params.tasks        - from useTasks()
 * @param {Array}  params.habits       - from useHabits()
 * @param {Array}  params.appointments - from useAppointments()
 * @param {Object} params.xpData       - from useXP()
 * @param {string} params.activePage   - current page name
 * @returns {string}
 */
export function buildAppState({ tasks, habits, appointments, xpData, activePage }) {
  const today   = new Date().toISOString().slice(0, 10)
  const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const in7Days = offsetDateStr(today, 7)

  const lines = []

  lines.push(`Date: ${today}  Time: ${nowTime}  Page: ${activePage}`)
  lines.push('')

  // ── Daily habits ──────────────────────────────────────────
  const dailyHabits = (habits ?? []).filter(h => h.frequency === 'daily')
  if (dailyHabits.length > 0) {
    lines.push('HABITS TODAY:')
    for (const h of dailyHabits) {
      const done = h.completions?.some(c => c.date === today) ? 'DONE' : 'PENDING'
      lines.push(`  [${done}] "${h.name}" [${h.category}] id:${h.id}`)
    }
    lines.push('')
  }

  // ── Tasks due today or overdue ────────────────────────────
  const dueTasks = (tasks ?? []).filter(
    t => !t.completed && t.dueDate && t.dueDate <= today
  )
  if (dueTasks.length > 0) {
    lines.push('TASKS DUE / OVERDUE:')
    for (const t of dueTasks) {
      const cats   = t.categories?.join(',') || 'none'
      const status = t.dueDate < today ? 'OVERDUE' : 'DUE TODAY'
      lines.push(`  [${status}] "${t.title}" [${t.priority}|${cats}] due:${t.dueDate} id:${t.id}`)
    }
    lines.push('')
  }

  // ── Upcoming tasks (next 7 days) ──────────────────────────
  const upcomingTasks = (tasks ?? []).filter(
    t => !t.completed && t.dueDate && t.dueDate > today && t.dueDate <= in7Days
  )
  if (upcomingTasks.length > 0) {
    lines.push('UPCOMING TASKS (7 days):')
    for (const t of upcomingTasks) {
      const cats = t.categories?.join(',') || 'none'
      lines.push(`  "${t.title}" [${t.priority}|${cats}] due:${t.dueDate} id:${t.id}`)
    }
    lines.push('')
  }

  // ── Appointments ──────────────────────────────────────────
  const upcomingAppts = (appointments ?? [])
    .filter(a => a.date >= today && a.date <= in7Days)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return (a.time || '').localeCompare(b.time || '')
    })
  if (upcomingAppts.length > 0) {
    lines.push('APPOINTMENTS (7 days):')
    for (const a of upcomingAppts) {
      const time = a.time ? ` at ${a.time}${a.endTime ? '-' + a.endTime : ''}` : ''
      lines.push(`  "${a.title}"${time} — ${a.date} id:${a.id}`)
    }
    lines.push('')
  }

  // ── XP stats ──────────────────────────────────────────────
  if (xpData) {
    lines.push(`XP: Global Lv${xpData.globalLevel} (${xpData.globalTotalXP} XP)`)
    const catLevels = Object.entries(xpData.categories ?? {})
      .map(([id, cat]) => `${CATEGORIES[id]?.name || id} Lv${levelFromXP(cat.totalXP || 0)}`)
      .join(' | ')
    if (catLevels) lines.push(`  ${catLevels}`)
  }

  return lines.join('\n')
}
