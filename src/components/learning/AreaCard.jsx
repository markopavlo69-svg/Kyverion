import { useLearning } from '@context/LearningContext'
import { getCategoryName } from '@utils/categoryConfig'

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${seconds}s`
}

export default function AreaCard({ area, onClick, onEdit, onDelete }) {
  const { getAreaStats, activeSession } = useLearning()
  const stats = getAreaStats(area.id)
  const isActive = activeSession?.areaId === area.id

  return (
    <div
      className={`area-card${isActive ? ' area-card--active' : ''}`}
      style={{ '--area-color': area.color }}
      onClick={onClick}
    >
      <div className="area-card__glow" />

      <div className="area-card__header">
        <div className="area-card__icon">{area.icon}</div>
        <div className="area-card__menu" onClick={e => e.stopPropagation()}>
          <button
            className="icon-btn"
            onClick={() => onEdit(area)}
            title="Edit area"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M9.5 2l1.5 1.5-6.5 6.5H3V8.5L9.5 2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            className="icon-btn icon-btn--danger"
            onClick={() => onDelete(area.id)}
            title="Delete area"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2 3.5h9M4.5 3.5V2.3a.3.3 0 01.3-.3h3.4a.3.3 0 01.3.3v1.2M3 3.5l.7 7a.5.5 0 00.5.5h5a.5.5 0 00.5-.5l.7-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="area-card__body">
        <h3 className="area-card__name">{area.name}</h3>
        <p className="area-card__category">{getCategoryName(area.category)}</p>
      </div>

      <div className="area-card__stats">
        <div className="area-stat">
          <span className="area-stat__val">{formatDuration(stats.todaySeconds)}</span>
          <span className="area-stat__lbl">Today</span>
        </div>
        <div className="area-stat">
          <span className="area-stat__val">{formatDuration(stats.totalSeconds)}</span>
          <span className="area-stat__lbl">All-time</span>
        </div>
        <div className="area-stat">
          <span className="area-stat__val">{stats.totalXP}</span>
          <span className="area-stat__lbl">XP Earned</span>
        </div>
      </div>

      <div className="area-card__meta">
        <span>{area.notes?.length ?? 0} notes</span>
        <span>·</span>
        <span>{area.links?.length ?? 0} links</span>
        {isActive && <span className="area-card__live">● LIVE</span>}
      </div>
    </div>
  )
}
