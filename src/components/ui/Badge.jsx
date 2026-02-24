import '@styles/components/badge.css'
import { getCategoryColor } from '@utils/categoryConfig'

export function PriorityBadge({ priority }) {
  const labels = { low: 'Low', medium: 'Medium', high: 'High' }
  return (
    <span className={`badge badge--priority-${priority}`}>
      {labels[priority] ?? priority}
    </span>
  )
}

export function CategoryBadge({ categoryId, name, color: colorProp }) {
  const color = colorProp ?? getCategoryColor(categoryId)
  return (
    <span
      className="badge badge--category"
      style={{ '--badge-color': color }}
    >
      {name}
    </span>
  )
}

export function LevelBadge({ level }) {
  return <span className="badge badge--level">Lv.{level}</span>
}

export function Badge({ children, variant = 'level', className = '', style }) {
  return (
    <span className={`badge badge--${variant} ${className}`} style={style}>
      {children}
    </span>
  )
}
