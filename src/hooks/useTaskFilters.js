import { useMemo } from 'react'
import { useTasks } from '@context/TaskContext'
import { useFilters } from '@context/FilterContext'

export function useTaskFilters() {
  const { tasks } = useTasks()
  const { filters, activeCategory } = useFilters()

  return useMemo(() => {
    let result = tasks

    const activeP   = filters.priority !== 'all' ? filters.priority : null
    const activeCat = activeCategory || (filters.category !== 'all' ? filters.category : null)

    if (activeP)          result = result.filter(t => t.priority === activeP)
    // Kyverion tasks have 'categories' array, not single 'category'
    if (activeCat)        result = result.filter(t => t.categories.includes(activeCat))
    if (filters.dateFrom) result = result.filter(t => t.dueDate && t.dueDate >= filters.dateFrom)
    if (filters.dateTo)   result = result.filter(t => t.dueDate && t.dueDate <= filters.dateTo)

    return result
  }, [tasks, filters, activeCategory])
}
