import { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { supabase } from '@lib/supabase'
import { useAuth } from './AuthContext'
import { useXP } from './XPContext'
import { getXPForTask } from '@utils/xpCalculator'
import { getTodayString, doesTaskRecurOn } from '@utils/dateUtils'

const TaskContext = createContext(null)

// Map DB row (snake_case) → app task (camelCase)
function dbToTask(row) {
  return {
    id:             row.id,
    title:          row.title,
    description:    row.description      ?? '',
    dueDate:        row.due_date         ?? null,
    priority:       row.priority         ?? 'medium',
    categories:     row.categories       ?? [],
    recurrence:     row.recurrence       ?? { type: 'none' },
    completed:      row.completed        ?? false,
    completedAt:    row.completed_at     ?? null,
    completedDates: row.completed_dates  ?? [],
    xpAwarded:      row.xp_awarded       ?? false,
    xpAwardedDates: row.xp_awarded_dates ?? [],
    createdAt:      row.created_at,
  }
}

// Map app task (camelCase) → DB row (snake_case)
function taskToDb(task, userId) {
  return {
    id:               task.id,
    user_id:          userId,
    title:            task.title,
    description:      task.description,
    due_date:         task.dueDate,
    priority:         task.priority,
    categories:       task.categories,
    recurrence:       task.recurrence,
    completed:        task.completed,
    completed_at:     task.completedAt,
    completed_dates:  task.completedDates,
    xp_awarded:       task.xpAwarded,
    xp_awarded_dates: task.xpAwardedDates,
    created_at:       task.createdAt,
  }
}

export function TaskProvider({ children }) {
  const { user }   = useAuth()
  const { awardXP } = useXP()
  const [tasks, setTasks] = useState([])

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) { console.error('Tasks load error:', error); return }
      setTasks((data ?? []).map(dbToTask))
    }
    load()
  }, [user.id])

  // ── CRUD ────────────────────────────────────────────────────────────────────
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
    supabase.from('tasks').insert(taskToDb(newTask, user.id))
      .then(({ error }) => { if (error) console.error('Task insert error:', error) })
  }, [user.id])

  const updateTask = useCallback((id, updates) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))

    // Build DB-compatible updates
    const dbUpdates = {}
    if ('dueDate'        in updates) dbUpdates.due_date         = updates.dueDate
    if ('priority'       in updates) dbUpdates.priority         = updates.priority
    if ('categories'     in updates) dbUpdates.categories       = updates.categories
    if ('recurrence'     in updates) dbUpdates.recurrence       = updates.recurrence
    if ('title'          in updates) dbUpdates.title            = updates.title
    if ('description'    in updates) dbUpdates.description      = updates.description
    if ('completed'      in updates) dbUpdates.completed        = updates.completed
    if ('completedAt'    in updates) dbUpdates.completed_at     = updates.completedAt
    if ('completedDates' in updates) dbUpdates.completed_dates  = updates.completedDates
    if ('xpAwarded'      in updates) dbUpdates.xp_awarded       = updates.xpAwarded
    if ('xpAwardedDates' in updates) dbUpdates.xp_awarded_dates = updates.xpAwardedDates

    supabase.from('tasks').update(dbUpdates).eq('id', id)
      .then(({ error }) => { if (error) console.error('Task update error:', error) })
  }, [])

  const deleteTask = useCallback((id) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    supabase.from('tasks').delete().eq('id', id)
      .then(({ error }) => { if (error) console.error('Task delete error:', error) })
  }, [])

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
      const newCompletedDates  = [...(task.completedDates ?? []), today]
      const newXpAwardedDates  = [...(task.xpAwardedDates ?? []), today]
      setTasks(prev => prev.map(t =>
        t.id === id
          ? { ...t, completedDates: newCompletedDates, xpAwardedDates: newXpAwardedDates }
          : t
      ))
      supabase.from('tasks').update({
        completed_dates:  newCompletedDates,
        xp_awarded_dates: newXpAwardedDates,
      }).eq('id', id).then(({ error }) => { if (error) console.error('Task complete error:', error) })
    } else {
      if (task.completed || task.xpAwarded) return
      const xpAmount = getXPForTask(task.priority)
      task.categories.forEach(catId => awardXP(catId, xpAmount))
      const completedAt = new Date().toISOString()
      setTasks(prev => prev.map(t =>
        t.id === id ? { ...t, completed: true, completedAt, xpAwarded: true } : t
      ))
      supabase.from('tasks').update({
        completed:    true,
        completed_at: completedAt,
        xp_awarded:   true,
      }).eq('id', id).then(({ error }) => { if (error) console.error('Task complete error:', error) })
    }
  }, [tasks, awardXP])

  const uncompleteTask = useCallback((id, dateStr) => {
    const today = dateStr || getTodayString()
    const task  = tasks.find(t => t.id === id)
    if (!task) return

    const isRecurring = task.recurrence && task.recurrence.type !== 'none'

    if (isRecurring) {
      const newDates = (task.completedDates ?? []).filter(d => d !== today)
      setTasks(prev => prev.map(t =>
        t.id === id ? { ...t, completedDates: newDates } : t
      ))
      supabase.from('tasks').update({ completed_dates: newDates }).eq('id', id)
        .then(({ error }) => { if (error) console.error('Task uncomplete error:', error) })
    } else {
      setTasks(prev => prev.map(t =>
        t.id === id ? { ...t, completed: false, completedAt: null } : t
      ))
      supabase.from('tasks').update({ completed: false, completed_at: null }).eq('id', id)
        .then(({ error }) => { if (error) console.error('Task uncomplete error:', error) })
    }
  }, [tasks])

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
