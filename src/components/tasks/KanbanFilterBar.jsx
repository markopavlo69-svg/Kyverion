import { SlidersHorizontal, X } from 'lucide-react'
import { useFilters } from '@context/FilterContext'
import { CATEGORY_LIST } from '@utils/categoryConfig'

export function KanbanFilterBar() {
  const { filters, setFilter, clearFilters, hasActiveFilters } = useFilters()

  return (
    <div className="kanban-filter-bar">
      <span className="kanban-filter-bar__label">
        <SlidersHorizontal size={12} />
        Filter
      </span>

      <div className="kanban-filter-bar__group">
        <select
          value={filters.priority}
          onChange={e => setFilter('priority', e.target.value)}
          aria-label="Filter by priority"
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={filters.category}
          onChange={e => setFilter('category', e.target.value)}
          aria-label="Filter by category"
        >
          <option value="all">All Categories</option>
          {CATEGORY_LIST.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
          ))}
        </select>
      </div>

      <div className="kanban-filter-bar__date-range">
        <span>From</span>
        <input
          type="date"
          value={filters.dateFrom}
          onChange={e => setFilter('dateFrom', e.target.value)}
          aria-label="Filter from date"
        />
        <span>To</span>
        <input
          type="date"
          value={filters.dateTo}
          onChange={e => setFilter('dateTo', e.target.value)}
          aria-label="Filter to date"
        />
      </div>

      {hasActiveFilters && (
        <button className="kanban-filter-bar__clear" onClick={clearFilters}>
          <X size={11} />
          Clear
        </button>
      )}
    </div>
  )
}
