import { createContext, useContext, useCallback } from 'react'
import { useLocalStorage } from '@hooks/useLocalStorage'
import { STORAGE_KEYS } from '@utils/storageKeys'
import { useXP } from './XPContext'
import { getXPForTask } from '@utils/xpCalculator'
import { getTodayString, doesTaskRecurOn } from '@utils/dateUtils'

const TaskContext = createContext(null)

export function TaskProvider({ children }) {
  const [tasks, setTasks] = useLocalStorage(STORAGE_KEYS.TASKS, [])
  const { awardXP } = useXP()

  const addTask = useCallback((taskData) => {
    const newTask = {
      id:             `task_${Date.now()}`,
      title:          taskData.title.trim(),
      description:    taskData.description?.trim() ?? '',
      dueDate:        taskData.dueDate || null,
      priority:       taskData.priority || 'medium',
      categories:     taskData.categories ?? [],
      recurrence:     taskData.recurrence ?? { type: 'none' },
      completed:      false,
      completedAt:    null,
      completedDates: [],
      xpAwarded:      false,
      xpAwardedDates: [],
      createdAt:      new Date().toISOString(),
    }
    setTasks(prev => [newTask, ...prev])
  }, [setTasks])

  const updateTask = useCallback((id, updates) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }, [setTasks])

  const deleteTask = useCallback((id) => {
    setTasks(prev => prev.filter(t => t.id !== id))
  }, [setTasks])

  const completeTask = useCallback((id, dateStr) => {
    const today = dateStr || getTodayString()
    const task  = tasks.find(t => t.id === id)
    if (!task) return

    const isRecurring = task.recurrence && task.recurrence.type !== 'none'

    if (isRecurring) {
      if ((task.completedDates ?? []).includes(today)) return
      if ((task.xpAwardedDates ?? []).includes(today)) return
      const xpAmount = getXPForTask(task.priority)
      task.categories.forEach(catId => awardXP(catId, xpAmount))
      setTasks(prev => prev.map(t =>
        t.id === id
          ? {
              ...t,
              completedDates: [...(t.completedDates ?? []), today],
              xpAwardedDates: [...(t.xpAwardedDates ?? []), today],
            }
          : t
      ))
    } else {
      if (task.completed || task.xpAwarded) return
      const xpAmount = getXPForTask(task.priority)
      task.categories.forEach(catId => awardXP(catId, xpAmount))
      setTasks(prev => prev.map(t =>
        t.id === id
          ? { ...t, completed: true, completedAt: new Date().toISOString(), xpAwarded: true }
          : t
      ))
    }
  }, [tasks, setTasks, awardXP])

  const uncompleteTask = useCallback((id, dateStr) => {
    const today = dateStr || getTodayString()
    const task  = tasks.find(t => t.id === id)
    if (!task) return

    const isRecurring = task.recurrence && task.recurrence.type !== 'none'

    if (isRecurring) {
      // XP is not reversed (effort was real)
      setTasks(prev => prev.map(t =>
        t.id === id
          ? { ...t, completedDates: (t.completedDates ?? []).filter(d => d !== today) }
          : t
      ))
    } else {
      setTasks(prev => prev.map(t =>
        t.id === id ? { ...t, completed: false, completedAt: null } : t
      ))
    }
  }, [tasks, setTasks])

  // Returns all tasks (one-off or recurring) that apply to the given date
  const getTasksByDate = useCallback((dateStr) => {
    return tasks.filter(t => doesTaskRecurOn(t, dateStr))
  }, [tasks])

  return (
    <TaskContext.Provider value={{
      tasks,
      addTask,
      updateTask,
      deleteTask,
      completeTask,
      uncompleteTask,
      getTasksByDate,
    }}>
      {children}
    </TaskContext.Provider>
  )
}

export function useTasks() {
  const ctx = useContext(TaskContext)
  if (!ctx) throw new Error('useTasks must be used within TaskProvider')
  return ctx
}
