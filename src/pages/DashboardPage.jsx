import { useState, useEffect, useMemo } from 'react'
import { useXP }          from '@context/XPContext'
import { useTasks }       from '@context/TaskContext'
import { useHabits }      from '@context/HabitContext'
import { useLearning }    from '@context/LearningContext'
import { useFinance }     from '@context/FinanceContext'
import { useNoSmoke }     from '@context/NoSmokeContext'
import { useAppointments } from '@context/AppointmentContext'
import { useWorkout }     from '@context/WorkoutContext'
import { getLevelTitle, progressPercent, xpToNextLevel, xpRequiredForLevel, levelFromXP } from '@utils/xpCalculator'
import { CATEGORY_LIST }  from '@utils/categoryConfig'
import { getTodayString, isOverdue, isTaskCompletedForDate, formatTime } from '@utils/dateUtils'
import '@styles/pages/dashboard.css'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtSeconds(s) {
  if (s <= 0) return '0m'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function fmtStreak(seconds) {
  if (seconds <= 0) return '0s'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (d > 0) return `${d}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ModuleCard({ title, icon, accentColor, onNavigate, page, stats, footer }) {
  return (
    <div className="dash-card" style={{ '--card-accent': accentColor }}>
      <div className="dash-card__header">
        <span className="dash-card__icon">{icon}</span>
        <span className="dash-card__title">{title}</span>
        <button className="dash-card__nav-btn" onClick={() => onNavigate(page)}>
          Open →
        </button>
      </div>
      <div className="dash-card__stats">
        {stats}
      </div>
      {footer && <div className="dash-card__footer">{footer}</div>}
    </div>
  )
}

function StatRow({ label, value, highlight }) {
  return (
    <div className="dash-stat">
      <span className="dash-stat__label">{label}</span>
      <span className={`dash-stat__value${highlight ? ` dash-stat__value--${highlight}` : ''}`}>
        {value}
      </span>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function DashboardPage({ onNavigate }) {
  const { xpData }              = useXP()
  const { tasks }               = useTasks()
  const { habits }              = useHabits()
  const { areas, getTotalStats } = useLearning()
  const { transactions, settings: finSettings, getMonthData } = useFinance()
  const { log, settings: nsSettings, record, startTime, getCurrentStreak } = useNoSmoke()
  const { appointments, getAppointmentsByDate } = useAppointments()
  const { sessions: workoutSessions, streak: workoutStreak, stats: workoutStats, prs: workoutPRs } = useWorkout()

  // Live no-smoke timer
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const today = getTodayString()

  // ── XP / Level ────────────────────────────────────────────────────────────
  const { globalLevel, globalTotalXP, categories } = xpData
  const title     = getLevelTitle(globalLevel)
  const pct       = progressPercent(globalTotalXP)
  const toNext    = xpToNextLevel(globalTotalXP)
  const levelFloor = xpRequiredForLevel(globalLevel)
  const levelCeil  = xpRequiredForLevel(globalLevel + 1)

  // ── Tasks ─────────────────────────────────────────────────────────────────
  const taskStats = useMemo(() => {
    const total   = tasks.length
    const done    = tasks.filter(t => isTaskCompletedForDate(t, today)).length
    const overdue = tasks.filter(t => {
      if (!t.recurrence || t.recurrence.type === 'none') return !t.completed && isOverdue(t.dueDate)
      return false
    }).length
    const high = tasks.filter(t => t.priority === 'high' && !isTaskCompletedForDate(t, today)).length
    return { total, done, overdue, high }
  }, [tasks, today])

  // ── Habits ────────────────────────────────────────────────────────────────
  const habitStats = useMemo(() => {
    const active   = habits.filter(h => h.active !== false)
    const doneToday = active.filter(h =>
      (h.completions ?? []).some(c => c.date === today)
    ).length
    const bestStreak = active.reduce((max, h) => Math.max(max, h.currentStreak ?? 0), 0)
    return { total: active.length, doneToday, bestStreak }
  }, [habits, today])

  // ── Learning ──────────────────────────────────────────────────────────────
  const learnStats = useMemo(() => {
    const stats = getTotalStats()
    return { ...stats, areaCount: areas.length }
  }, [areas, getTotalStats])

  // ── Finance ───────────────────────────────────────────────────────────────
  const financeStats = useMemo(() => {
    const monthStr = today.slice(0, 7) // YYYY-MM
    const data = getMonthData(monthStr)
    const cur = finSettings.currency ?? '€'
    return { ...data, currency: cur }
  }, [transactions, finSettings, getMonthData, today])

  // ── No Smoke ──────────────────────────────────────────────────────────────
  const smokeStats = useMemo(() => {
    const streak    = getCurrentStreak(now)
    const todayTs   = new Date(today + 'T00:00:00').getTime()
    const todayCount = log.filter(t => t >= todayTs && t < todayTs + 86400000).length
    const { dailyCigarettes = 20, packPrice = 7 } = nsSettings
    const pricePerCig = packPrice / 20
    const savedSeconds = record
    const saved = ((savedSeconds / 86400) * dailyCigarettes * pricePerCig).toFixed(2)
    return { streak, todayCount, saved, record }
  }, [log, nsSettings, record, getCurrentStreak, now, today])

  // ── Calendar ──────────────────────────────────────────────────────────────
  const calStats = useMemo(() => {
    const todayAppts = getAppointmentsByDate(today)
    const soon = appointments
      .filter(a => a.date > today)
      .sort((a, b) => a.date.localeCompare(b.date))
    const next = soon[0] ?? null
    return { todayCount: todayAppts.length, todayAppts, next }
  }, [appointments, getAppointmentsByDate, today])

  // ── Workout ───────────────────────────────────────────────────────────────
  const workoutDashStats = useMemo(() => {
    const lastSession = workoutSessions[0] ?? null
    const lastDate    = lastSession
      ? new Date(lastSession.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : 'None yet'
    return {
      totalSessions: workoutStats.totalSessions,
      streak:        workoutStreak,
      totalPRs:      workoutStats.totalPRs,
      lastDate,
    }
  }, [workoutSessions, workoutStreak, workoutStats])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard">

      {/* ── Hero: Global Level ─────────────────────────────────────────────── */}
      <section className="dash-hero">
        <div className="dash-hero__left">
          <div className="dash-hero__orb" onClick={() => onNavigate('profile')}>
            <span className="dash-hero__level">{globalLevel}</span>
          </div>
          <div className="dash-hero__info">
            <div className="dash-hero__title">{title}</div>
            <div className="dash-hero__xp">{globalTotalXP.toLocaleString()} total XP</div>
            <div className="dash-hero__bar-wrap">
              <div className="dash-hero__bar" style={{ width: `${pct}%` }} />
            </div>
            <div className="dash-hero__bar-label">
              {toNext.toLocaleString()} XP to Level {globalLevel + 1}
            </div>
          </div>
        </div>

        <div className="dash-hero__cats">
          {CATEGORY_LIST.map(cat => {
            const catData = categories[cat.id] ?? { totalXP: 0, level: 1 }
            return (
              <div key={cat.id} className="dash-hero__cat" style={{ '--cat-color': cat.color }}>
                <span className="dash-hero__cat-icon">{cat.icon}</span>
                <span className="dash-hero__cat-name">{cat.name}</span>
                <span className="dash-hero__cat-level">Lv {catData.level}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Module Cards ───────────────────────────────────────────────────── */}
      <div className="dash-grid">

        {/* Tasks */}
        <ModuleCard
          title="Tasks"
          icon="✅"
          accentColor="#f59e0b"
          onNavigate={onNavigate}
          page="tasks"
          stats={<>
            <StatRow label="Total Tasks"  value={taskStats.total} />
            <StatRow label="Done Today"   value={taskStats.done}    highlight="gold" />
            <StatRow label="Overdue"      value={taskStats.overdue} highlight={taskStats.overdue > 0 ? 'danger' : undefined} />
            <StatRow label="High Priority" value={taskStats.high}   highlight={taskStats.high > 0 ? 'warn' : undefined} />
          </>}
        />

        {/* Habits */}
        <ModuleCard
          title="Habits"
          icon="🔥"
          accentColor="#10b981"
          onNavigate={onNavigate}
          page="habits"
          stats={<>
            <StatRow label="Done Today"  value={`${habitStats.doneToday} / ${habitStats.total}`} highlight="gold" />
            <StatRow label="Active Habits" value={habitStats.total} />
            <StatRow label="Best Streak" value={`${habitStats.bestStreak}d`} highlight={habitStats.bestStreak >= 7 ? 'gold' : undefined} />
          </>}
          footer={
            habitStats.total > 0 && (
              <div className="dash-card__progress-row">
                <div className="dash-card__progress-bar">
                  <div
                    className="dash-card__progress-fill"
                    style={{ width: `${Math.round((habitStats.doneToday / habitStats.total) * 100)}%` }}
                  />
                </div>
                <span>{Math.round((habitStats.doneToday / habitStats.total) * 100)}%</span>
              </div>
            )
          }
        />

        {/* Learning */}
        <ModuleCard
          title="Learning"
          icon="📚"
          accentColor="#3b82f6"
          onNavigate={onNavigate}
          page="learning"
          stats={<>
            <StatRow label="Today"       value={fmtSeconds(learnStats.todaySeconds)} highlight="gold" />
            <StatRow label="Total Study" value={fmtSeconds(learnStats.totalSeconds)} />
            <StatRow label="Areas"       value={learnStats.areaCount} />
            <StatRow label="XP Earned"   value={`${learnStats.totalXP} XP`} />
          </>}
        />

        {/* Finance */}
        <ModuleCard
          title="Finance"
          icon="💰"
          accentColor="#a855f7"
          onNavigate={onNavigate}
          page="finance"
          stats={<>
            <StatRow
              label="Income"
              value={`${financeStats.currency}${(financeStats.totalIncome ?? 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}`}
              highlight="gold"
            />
            <StatRow
              label="Expenses"
              value={`${financeStats.currency}${(financeStats.totalExpenses ?? 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}`}
              highlight={(financeStats.totalExpenses ?? 0) > (financeStats.totalIncome ?? 0) ? 'danger' : undefined}
            />
            <StatRow
              label="Net"
              value={`${financeStats.currency}${((financeStats.net ?? 0)).toLocaleString('de-DE', { minimumFractionDigits: 2 })}`}
              highlight={(financeStats.net ?? 0) >= 0 ? 'gold' : 'danger'}
            />
            <StatRow label="Budget Goal" value={financeStats.isGoalMet ? '✓ Met' : '✗ Pending'} highlight={financeStats.isGoalMet ? 'gold' : undefined} />
          </>}
        />

        {/* No Smoke */}
        <ModuleCard
          title="No Smoke"
          icon="🚭"
          accentColor="#06b6d4"
          onNavigate={onNavigate}
          page="nosmoke"
          stats={<>
            <StatRow label="Current Streak" value={fmtStreak(smokeStats.streak)} highlight="gold" />
            <StatRow label="Record"          value={fmtStreak(smokeStats.record)} />
            <StatRow label="Today's Count"   value={smokeStats.todayCount}         highlight={smokeStats.todayCount > 0 ? 'danger' : undefined} />
            <StatRow label="Money Saved"     value={`€${smokeStats.saved}`}        highlight="gold" />
          </>}
        />

        {/* Calendar */}
        <ModuleCard
          title="Calendar"
          icon="📅"
          accentColor="#f59e0b"
          onNavigate={onNavigate}
          page="calendar"
          stats={<>
            <StatRow label="Today" value={new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} />
            <StatRow label="Events Today" value={calStats.todayCount} highlight={calStats.todayCount > 0 ? 'gold' : undefined} />
            <StatRow
              label="Next Event"
              value={calStats.next
                ? `${new Date(calStats.next.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${calStats.next.time ? ' · ' + formatTime(calStats.next.time) : ''}`
                : 'None'
              }
            />
          </>}
          footer={
            calStats.todayAppts.length > 0 && (
              <ul className="dash-appt-list">
                {calStats.todayAppts.slice(0, 2).map(a => (
                  <li key={a.id} className="dash-appt-item" style={{ '--appt-color': a.color ?? 'var(--accent-teal)' }}>
                    {a.time ? <span className="dash-appt-time">{formatTime(a.time)}</span> : null}
                    <span className="dash-appt-title">{a.title}</span>
                  </li>
                ))}
                {calStats.todayAppts.length > 2 && (
                  <li className="dash-appt-more">+{calStats.todayAppts.length - 2} more</li>
                )}
              </ul>
            )
          }
        />

        {/* Workout */}
        <ModuleCard
          title="Workout"
          icon="🏋️"
          accentColor="#ef4444"
          onNavigate={onNavigate}
          page="workout"
          stats={<>
            <StatRow label="Sessions"    value={workoutDashStats.totalSessions} />
            <StatRow label="Streak"      value={`${workoutDashStats.streak}d`}  highlight={workoutDashStats.streak >= 7 ? 'gold' : undefined} />
            <StatRow label="PRs Set"     value={workoutDashStats.totalPRs}      highlight={workoutDashStats.totalPRs > 0 ? 'gold' : undefined} />
            <StatRow label="Last Session" value={workoutDashStats.lastDate} />
          </>}
        />

      </div>
    </div>
  )
}
