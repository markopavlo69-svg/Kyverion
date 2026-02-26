import { useMemo } from 'react'
import { useWorkout } from '@context/WorkoutContext'

// ── SVG Activity Chart ────────────────────────────────────────────────────────
function ActivityChart({ weekData }) {
  const maxCount = Math.max(1, ...weekData.map(w => w.count))
  const BAR_W    = 28
  const BAR_GAP  = 8
  const MAX_H    = 80
  const SVG_W    = weekData.length * (BAR_W + BAR_GAP) - BAR_GAP
  const SVG_H    = MAX_H + 28  // +28 for labels

  return (
    <svg className="activity-chart" viewBox={`0 0 ${SVG_W} ${SVG_H}`} xmlns="http://www.w3.org/2000/svg">
      {weekData.map((w, i) => {
        const barH   = w.count === 0 ? 4 : Math.max(8, Math.round((w.count / maxCount) * MAX_H))
        const x      = i * (BAR_W + BAR_GAP)
        const y      = MAX_H - barH
        const label  = `W${i + 1}`
        const isLast = i === weekData.length - 1

        return (
          <g key={i}>
            <rect
              x={x} y={y} width={BAR_W} height={barH}
              rx={4}
              className={`chart-bar${w.count === 0 ? ' chart-bar--empty' : ''}${isLast ? ' chart-bar--current' : ''}`}
            />
            {w.count > 0 && (
              <text x={x + BAR_W / 2} y={y - 5} textAnchor="middle" className="chart-value">
                {w.count}
              </text>
            )}
            <text x={x + BAR_W / 2} y={SVG_H - 4} textAnchor="middle" className="chart-label">
              {isLast ? 'Now' : label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`overview-stat${accent ? ` overview-stat--${accent}` : ''}`}>
      <div className="overview-stat__value">{value}</div>
      <div className="overview-stat__label">{label}</div>
      {sub && <div className="overview-stat__sub">{sub}</div>}
    </div>
  )
}

// ── Streak Badge ──────────────────────────────────────────────────────────────
function StreakBadge({ streak }) {
  if (streak < 7) return null
  const milestones = [
    { threshold: 30, label: '30-Day Warrior', icon: '🔥', color: 'strength' },
    { threshold: 7,  label: '7-Day Streak',   icon: '⚡', color: 'discipline' },
  ]
  const badge = milestones.find(m => streak >= m.threshold)
  if (!badge) return null
  return (
    <div className={`streak-badge streak-badge--${badge.color}`}>
      <span className="streak-badge__icon">{badge.icon}</span>
      <div>
        <div className="streak-badge__label">{badge.label}</div>
        <div className="streak-badge__count">{streak} consecutive days</div>
      </div>
    </div>
  )
}

export default function WorkoutOverview() {
  const { sessions, prs, streak, stats, getWeeklyActivity } = useWorkout()

  const weekData   = getWeeklyActivity(8)
  const recentPRs  = useMemo(() => {
    // Sort PRs by most recently achieved
    return Object.entries(prs)
      .map(([name, pr]) => ({ name, ...pr }))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 6)
  }, [prs])

  // Category breakdown
  const breakdown = useMemo(() => {
    const counts = { calisthenics: 0, gym: 0, other: 0 }
    for (const s of sessions) counts[s.category] = (counts[s.category] || 0) + 1
    return counts
  }, [sessions])

  if (sessions.length === 0) {
    return (
      <div className="workout-overview">
        <div className="empty-section">
          <div className="empty-icon">🏋️</div>
          <p className="empty-title">No workouts logged yet</p>
          <p className="empty-desc">Head to a category tab and log your first session!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="workout-overview">
      {/* ── Stat cards ── */}
      <div className="overview-stats">
        <StatCard label="Total Sessions" value={stats.totalSessions} accent="discipline" />
        <StatCard label="Total Sets"     value={stats.totalSets} />
        <StatCard
          label="Streak"
          value={`${streak}d`}
          sub={streak >= 7 ? '🔥 On fire!' : streak > 0 ? 'Keep going!' : 'Start today!'}
          accent={streak >= 7 ? 'strength' : undefined}
        />
        <StatCard label="PRs Set" value={stats.totalPRs} accent="vitality" />
      </div>

      {/* ── Streak badge ── */}
      <StreakBadge streak={streak} />

      {/* ── Activity chart ── */}
      <div className="overview-chart-section">
        <h3 className="section-title">Activity (Last 8 Weeks)</h3>
        <div className="overview-chart-wrap">
          <ActivityChart weekData={weekData} />
        </div>
      </div>

      {/* ── Two column: category breakdown + recent PRs ── */}
      <div className="overview-bottom">
        {/* Category breakdown */}
        <div className="overview-breakdown">
          <h3 className="section-title">By Category</h3>
          <div className="breakdown-bars">
            {[
              { id: 'calisthenics', label: 'Calisthenics', icon: '🤸', color: 'strength' },
              { id: 'gym',          label: 'Gym',          icon: '🏋️', color: 'discipline' },
              { id: 'other',        label: 'Other',        icon: '💪', color: 'vitality' },
            ].map(cat => {
              const count = breakdown[cat.id] || 0
              const pct   = stats.totalSessions > 0 ? Math.round((count / stats.totalSessions) * 100) : 0
              return (
                <div key={cat.id} className="breakdown-bar">
                  <div className="breakdown-bar__label">
                    <span>{cat.icon} {cat.label}</span>
                    <span className="breakdown-bar__count">{count}</span>
                  </div>
                  <div className="breakdown-bar__track">
                    <div
                      className={`breakdown-bar__fill breakdown-bar__fill--${cat.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent PRs */}
        {recentPRs.length > 0 && (
          <div className="overview-prs">
            <h3 className="section-title">Personal Records</h3>
            <div className="pr-list">
              {recentPRs.map(pr => (
                <div key={pr.name} className="pr-item">
                  <span className="pr-item__icon">🏆</span>
                  <div className="pr-item__info">
                    <div className="pr-item__name">{pr.name}</div>
                    <div className="pr-item__val">
                      {pr.weight > 0 ? `${pr.weight} ${pr.unit}` : ''}{pr.weight > 0 && pr.reps > 0 ? ' × ' : ''}{pr.reps > 0 ? `${pr.reps} reps` : ''}
                    </div>
                  </div>
                  <span className="pr-item__date">{pr.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
