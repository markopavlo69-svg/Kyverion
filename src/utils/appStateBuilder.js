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

/** Compute consecutive-day streak for a habit from its completions array */
function computeHabitStreak(completions) {
  const today = new Date().toISOString().slice(0, 10)
  const dates = new Set((completions ?? []).map(c => c.date))
  let streak = 0
  // If done today, count from today; otherwise start checking from yesterday
  const startOffset = dates.has(today) ? 0 : 1
  for (let i = startOffset; i < 400; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const day = d.toISOString().slice(0, 10)
    if (dates.has(day)) streak++
    else break
  }
  return streak
}

/** Format seconds into "Xh Ym" or "Zm" */
function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

/** Truncate a string to maxLen characters */
function trunc(str, maxLen = 80) {
  if (!str) return ''
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str
}

/**
 * @param {Object} params
 * @param {Array}  params.tasks          - from useTasks()
 * @param {Array}  params.habits         - from useHabits()
 * @param {Array}  params.appointments   - from useAppointments()
 * @param {Object} params.xpData         - from useXP()
 * @param {string} params.activePage     - current page name
 * @param {Object} params.workoutData    - { sessions, streak, prs } from useWorkout()
 * @param {Object} [params.charStats]    - current character relationship stats
 * @param {number} [params.disciplineScore] - 0-100 7-day activity score
 * @param {Object} [params.financeData]  - { transactions, currency } from useFinance()
 * @param {Object} [params.learningData] - { areas } from useLearning()
 * @param {Object} [params.nosmokeData]  - { streakSeconds, startTime, nextMilestoneLabel, nextMilestoneSeconds }
 * @returns {string}
 */
export function buildAppState({
  tasks, habits, appointments, xpData, activePage, workoutData,
  charStats, disciplineScore, financeData, learningData, nosmokeData,
}) {
  const today   = new Date().toISOString().slice(0, 10)
  const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const in7Days = offsetDateStr(today, 7)

  const lines = []

  lines.push(`Date: ${today}  Time: ${nowTime}  Page: ${activePage}`)
  lines.push('')

  // ── Daily habits ──────────────────────────────────────────
  const dailyHabits = (habits ?? []).filter(h => h.frequency === 'daily')
  if (dailyHabits.length > 0) {
    lines.push('HABITS TODAY (daily):')
    for (const h of dailyHabits) {
      const done   = h.completions?.some(c => c.date === today) ? 'DONE' : 'PENDING'
      const streak = computeHabitStreak(h.completions)
      const streakStr = streak > 0 ? ` 🔥${streak}d` : ''
      lines.push(`  [${done}] "${h.name}" [${h.category}]${streakStr} id:${h.id}`)
    }
    lines.push('')
  }

  // ── Non-daily habits ──────────────────────────────────────
  const nonDailyHabits = (habits ?? []).filter(h => h.frequency && h.frequency !== 'daily')
  if (nonDailyHabits.length > 0) {
    lines.push('HABITS (weekly/other):')
    for (const h of nonDailyHabits) {
      // Count completions in the last 7 days
      const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().slice(0, 10)
      })
      const doneThisWeek = (h.completions ?? []).filter(c => last7.includes(c.date)).length
      const streak = computeHabitStreak(h.completions)
      const streakStr = streak > 0 ? ` 🔥${streak}d` : ''
      lines.push(`  "${h.name}" [${h.frequency}|${h.category}] ${doneThisWeek}x this week${streakStr} id:${h.id}`)
    }
    lines.push('')
  }

  // ── Tasks due today or overdue (only incomplete) ──────────
  const dueTasks = (tasks ?? []).filter(
    t => !t.completed && t.dueDate && t.dueDate <= today
  )
  if (dueTasks.length > 0) {
    lines.push('TASKS DUE / OVERDUE:')
    for (const t of dueTasks) {
      const cats      = t.categories?.join(',') || 'none'
      const dueStatus = t.dueDate < today ? 'OVERDUE' : 'DUE TODAY'
      const stage     = t.status ?? 'todo'
      const desc      = t.description ? ` — "${trunc(t.description)}"` : ''
      lines.push(`  [${dueStatus}|${stage}] "${t.title}" [${t.priority}|${cats}]${desc} due:${t.dueDate} id:${t.id}`)
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
      const cats  = t.categories?.join(',') || 'none'
      const stage = t.status ?? 'todo'
      const desc  = t.description ? ` — "${trunc(t.description)}"` : ''
      lines.push(`  [${stage}] "${t.title}" [${t.priority}|${cats}]${desc} due:${t.dueDate} id:${t.id}`)
    }
    lines.push('')
  }

  // ── Undated tasks (no due date, incomplete) ───────────────
  const undatedTasks = (tasks ?? []).filter(t => !t.completed && !t.dueDate)
  if (undatedTasks.length > 0) {
    lines.push('TASKS (no due date):')
    for (const t of undatedTasks) {
      const cats  = t.categories?.join(',') || 'none'
      const stage = t.status ?? 'todo'
      const desc  = t.description ? ` — "${trunc(t.description)}"` : ''
      lines.push(`  [${stage}] "${t.title}" [${t.priority}|${cats}]${desc} id:${t.id}`)
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

  // ── Workout summary ────────────────────────────────────────
  if (workoutData) {
    const { sessions = [], streak = 0, prs = {} } = workoutData
    if (sessions.length > 0) {
      lines.push(`WORKOUTS: ${sessions.length} total  Streak: ${streak}d  PRs: ${Object.keys(prs).length}`)
      const recent = sessions.slice(0, 3)
      for (const s of recent) {
        lines.push(`  ${s.date} [${s.category}] "${s.title}" — ${s.exercises.length} exercises`)
      }
      const topPRs = Object.entries(prs).slice(0, 3).map(([n, p]) => `${n}: ${p.weight}${p.unit}`).join(', ')
      if (topPRs) lines.push(`  Top PRs: ${topPRs}`)
      lines.push('')
    }
  }

  // ── Finance ───────────────────────────────────────────────
  if (financeData) {
    const { transactions = [], currency = '€' } = financeData
    const currentMonth = today.slice(0, 7)
    const monthTx = transactions.filter(t => t.date?.startsWith(currentMonth))
    const income  = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const balance = income - expense
    lines.push(`FINANCE (${currentMonth}): Income ${currency}${income.toFixed(2)}  Expenses ${currency}${expense.toFixed(2)}  Balance ${currency}${balance.toFixed(2)}`)
    const recent5 = transactions.slice(0, 5)
    for (const t of recent5) {
      const sign = t.type === 'income' ? '+' : '-'
      lines.push(`  ${t.date} [${t.category}] ${sign}${currency}${t.amount.toFixed(2)} "${t.description || '—'}" id:${t.id}`)
    }
    lines.push('')
  }

  // ── Learning hub ──────────────────────────────────────────
  if (learningData) {
    const { areas = [] } = learningData
    if (areas.length > 0) {
      lines.push('LEARNING AREAS:')
      for (const a of areas) {
        const totalTime  = formatDuration(a.totalSeconds ?? 0)
        const noteCount  = (a.notes ?? []).length
        const linkCount  = (a.links ?? []).length
        const sessions7  = (a.sessions ?? []).filter(s => s.date >= offsetDateStr(today, -7)).length
        lines.push(`  [${a.name}] id:${a.id}  Total: ${totalTime}  ${noteCount} notes  ${linkCount} links  ${sessions7} sessions (last 7d)`)
        // Show all notes with truncated content
        for (const n of (a.notes ?? [])) {
          const preview = trunc(n.content?.replace(/\n/g, ' '), 100)
          lines.push(`    📝 NOTE "${n.title}" id:${n.id}${preview ? `: ${preview}` : ''}`)
        }
        // Show recent 2 sessions
        const recentSessions = (a.sessions ?? []).slice(-2)
        for (const s of recentSessions) {
          lines.push(`    ⏱ Session ${s.date}: ${formatDuration(s.durationSeconds ?? 0)}`)
        }
      }
      lines.push('')
    }
  }

  // ── NoSmoke tracker ───────────────────────────────────────
  if (nosmokeData && nosmokeData.startTime) {
    const { streakSeconds = 0, nextMilestoneLabel = '', nextMilestoneSeconds = 0 } = nosmokeData
    const streakStr = formatDuration(streakSeconds)
    const nextStr   = nextMilestoneLabel
      ? ` — next: "${nextMilestoneLabel}" in ${formatDuration(Math.max(0, nextMilestoneSeconds - streakSeconds))}`
      : ''
    lines.push(`NO SMOKE: Current streak ${streakStr}${nextStr}`)
    lines.push('')
  }

  // ── XP stats ──────────────────────────────────────────────
  if (xpData) {
    lines.push(`XP: Global Lv${xpData.globalLevel} (${xpData.globalTotalXP} XP)`)
    const catLevels = Object.entries(xpData.categories ?? {})
      .map(([id, cat]) => `${CATEGORIES[id]?.name || id} Lv${levelFromXP(cat.totalXP || 0)}`)
      .join(' | ')
    if (catLevels) lines.push(`  ${catLevels}`)
    lines.push('')
  }

  // ── Character relationship state (DACS) ───────────────────
  if (charStats) {
    lines.push('RELATIONSHIP STATE (your stats with this user):')
    lines.push(`  Respect:    ${charStats.respect_level ?? 0}/100`)
    lines.push(`  Trust:      ${charStats.trust_level ?? 0}/100`)
    lines.push(`  Attachment: ${charStats.attachment_level ?? 0}/100`)
    lines.push(`  Attraction: ${charStats.attraction_level ?? 0}/100`)
    lines.push(`  Mood:       ${charStats.current_mood ?? 'neutral'}`)
    lines.push(`  Mode:       ${charStats.relationship_mode ?? 'neutral'}`)
    if (disciplineScore !== undefined) {
      lines.push(`  User 7-day discipline score: ${disciplineScore}/100`)
    }
    lines.push('')
  }

  return lines.join('\n')
}
