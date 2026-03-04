import { LayoutGrid, CheckCircle2, Loader2, AlertCircle, Star } from 'lucide-react'
import { useTasks } from '@context/TaskContext'
import { useXP } from '@context/XPContext'
import { isOverdue } from '@utils/dateUtils'
import { progressPercent } from '@utils/xpCalculator'
import ProgressBar from '@components/ui/ProgressBar'

function StatCard({ label, value, icon, color = 'default' }) {
  return (
    <div className={`kanban-stat-card kanban-stat-card--${color}`}>
      <span className="kanban-stat-card__icon">{icon}</span>
      <div className="kanban-stat-card__data">
        <span className="kanban-stat-card__value">{value}</span>
        <span className="kanban-stat-card__label">{label}</span>
      </div>
    </div>
  )
}

export function KanbanProgressPanel() {
  const { tasks }   = useTasks()
  const { xpData }  = useXP()

  const total       = tasks.length
  const done        = tasks.filter(t => t.status === 'done').length
  const inProgress  = tasks.filter(t => t.status === 'in-progress').length
  const overdue     = tasks.filter(t => isOverdue(t.dueDate) && t.status !== 'done').length
  const completePct = total > 0 ? Math.round((done / total) * 100) : 0

  const globalXP    = xpData?.globalTotalXP ?? 0
  const globalLevel = xpData?.globalLevel   ?? 1
  const xpPct       = progressPercent(globalXP)

  return (
    <div className="kanban-progress">
      <div className="kanban-stat-cards">
        <StatCard label="Total"       value={total}      icon={<LayoutGrid size={16} />}   color="default" />
        <StatCard label="Done"        value={done}       icon={<CheckCircle2 size={16} />} color="teal" />
        <StatCard label="In Progress" value={inProgress} icon={<Loader2 size={16} />}      color="pink" />
        {overdue > 0 && (
          <StatCard label="Overdue" value={overdue} icon={<AlertCircle size={16} />} color="red" />
        )}
      </div>

      <div className="kanban-progress__completion">
        <div className="kanban-progress__row">
          <span className="kanban-progress__label">Completion</span>
          <span className="kanban-progress__pct">{completePct}%</span>
        </div>
        <ProgressBar value={completePct} color="var(--accent-teal)" />
      </div>

      <div className="kanban-progress__xp">
        <div className="kanban-progress__row">
          <span className="kanban-progress__xp-title">
            <Star size={13} />
            Level {globalLevel}
          </span>
          <span className="kanban-progress__xp-val">{globalXP} XP total</span>
        </div>
        <ProgressBar value={xpPct} color="var(--accent-gold)" />
      </div>
    </div>
  )
}
