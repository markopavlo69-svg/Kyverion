import { CATEGORY_LIST } from '@utils/categoryConfig'
import '@styles/pages/tasks.css'

export default function TaskFilters({ filters, onFilterChange }) {
  const statuses = [
    { value: 'all',    label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'done',   label: 'Done' },
  ]

  return (
    <div className="task-filters">
      {/* Status filter buttons */}
      {statuses.map(s => (
        <button
          key={s.value}
          className={`filter-btn${filters.status === s.value ? ' filter-btn--active' : ''}`}
          onClick={() => onFilterChange('status', s.value)}
        >
          {s.label}
        </button>
      ))}

      {/* Priority filter */}
      <select
        className="filter-select"
        value={filters.priority}
        onChange={e => onFilterChange('priority', e.target.value)}
      >
        <option value="all">All Priorities</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>

      {/* Category filter */}
      <select
        className="filter-select"
        value={filters.category}
        onChange={e => onFilterChange('category', e.target.value)}
      >
        <option value="all">All Categories</option>
        {CATEGORY_LIST.map(cat => (
          <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
        ))}
      </select>
    </div>
  )
}
