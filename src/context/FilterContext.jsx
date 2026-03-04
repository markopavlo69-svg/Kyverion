import { createContext, useContext, useState } from 'react'

const FilterContext = createContext(null)

export function FilterProvider({ children }) {
  const [filters, setFilters] = useState({
    priority: 'all',
    category: 'all',
    dateFrom: '',
    dateTo: '',
  })
  const [activeCategory, setActiveCategory] = useState(null)

  function setFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  function clearFilters() {
    setFilters({ priority: 'all', category: 'all', dateFrom: '', dateTo: '' })
    setActiveCategory(null)
  }

  function toggleCategory(categoryId) {
    setActiveCategory(prev => prev === categoryId ? null : categoryId)
  }

  const hasActiveFilters =
    filters.priority !== 'all' ||
    filters.category !== 'all' ||
    filters.dateFrom !== '' ||
    filters.dateTo   !== '' ||
    activeCategory   !== null

  return (
    <FilterContext.Provider value={{
      filters,
      setFilter,
      clearFilters,
      activeCategory,
      toggleCategory,
      hasActiveFilters,
    }}>
      {children}
    </FilterContext.Provider>
  )
}

export function useFilters() {
  const ctx = useContext(FilterContext)
  if (!ctx) throw new Error('useFilters must be used inside FilterProvider')
  return ctx
}
