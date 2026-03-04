import { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import { supabase } from '@lib/supabase'
import { useAuth } from './AuthContext'
import { useXP } from './XPContext'
import { getXPForTask } from '@utils/xpCalculator'
import { getTodayString, doesTaskRecurOn, getNextOccurrence } from '@utils/dateUtils'

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
    // Kanban fields
    status:         row.status ?? (row.completed ? 'done' : 'todo'),
    tags:           row.tags ?? [],
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
    status:           task.status,
    tags:             task.tags,
    created_at:       task.createdAt,
  }
}

export function TaskProvider({ children }) {
  const { user }    = useAuth()
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
      status:         taskData.status || 'todo',
      tags:           taskData.tags ?? [],
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
    if ('status'         in updates) dbUpdates.status           = updates.status
    if ('tags'           in updates) dbUpdates.tags             = updates.tags

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
      const xpAmount = getXPForTask(task.priority)
      task.categories.forEach(catId => awardXP(catId, xpAmount))

      setTasks(prev => prev.filter(t => t.id !== id))
      supabase.from('tasks').delete().eq('id', id)
        .then(({ error }) => { if (error) console.error('Task delete error:', error) })

      const nextDate = getNextOccurrence(task, today)
      if (nextDate) {
        const nextTask = {
          id:             `task_${Date.now()}`,
          title:          task.title,
          description:    task.description,
          dueDate:        nextDate,
          priority:       task.priority,
          categories:     task.categories,
          recurrence:     task.recurrence,
          completed:      false,
          completedAt:    null,
          completedDates: [],
          xpAwarded:      false,
          xpAwardedDates: [],
          status:         'todo',
          tags:           task.tags ?? [],
          createdAt:      new Date().toISOString(),
        }
        setTasks(prev => [nextTask, ...prev])
        supabase.from('tasks').insert(taskToDb(nextTask, user.id))
          .then(({ error }) => { if (error) console.error('Task insert error:', error) })
      }
    } else {
      if (task.completed) return
      const xpAmount = getXPForTask(task.priority)
      if (!task.xpAwarded) {
        task.categories.forEach(catId => awardXP(catId, xpAmount))
      }
      const completedAt = new Date().toISOString()
      setTasks(prev => prev.map(t =>
        t.id === id ? { ...t, completed: true, completedAt, xpAwarded: true, status: 'done' } : t
      ))
      supabase.from('tasks').update({
        completed:    true,
        completed_at: completedAt,
        xp_awarded:   true,
        status:       'done',
      }).eq('id', id).then(({ error }) => { if (error) console.error('Task complete error:', error) })
    }
  }, [tasks, awardXP, user.id])

  const uncompleteTask = useCallback((id) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return

    const isRecurring = task.recurrence && task.recurrence.type !== 'none'
    if (isRecurring) return

    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, completed: false, completedAt: null, status: 'todo' } : t
    ))
    supabase.from('tasks').update({ completed: false, completed_at: null, status: 'todo' }).eq('id', id)
      .then(({ error }) => { if (error) console.error('Task uncomplete error:', error) })
  }, [tasks])

  // ── Kanban ──────────────────────────────────────────────────────────────────
  const moveTask = useCallback((taskId, newStatus) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const isRecurring = task.recurrence && task.recurrence.type !== 'none'

    if (newStatus === 'done' && task.status !== 'done') {
      if (isRecurring) {
        // Award XP, delete task, create next occurrence
        const xpAmount = getXPForTask(task.priority)
        task.categories.forEach(catId => awardXP(catId, xpAmount))

        setTasks(prev => prev.filter(t => t.id !== taskId))
        supabase.from('tasks').delete().eq('id', taskId)
          .then(({ error }) => { if (error) console.error('Task delete error:', error) })

        const today = getTodayString()
        const nextDate = getNextOccurrence(task, today)
        if (nextDate) {
          const nextTask = {
            id:             `task_${Date.now()}`,
            title:          task.title,
            description:    task.description,
            dueDate:        nextDate,
            priority:       task.priority,
            categories:     task.categories,
            recurrence:     task.recurrence,
            completed:      false,
            completedAt:    null,
            completedDates: [],
            xpAwarded:      false,
            xpAwardedDates: [],
            status:         'todo',
            tags:           task.tags ?? [],
            createdAt:      new Date().toISOString(),
          }
          setTasks(prev => [nextTask, ...prev])
          supabase.from('tasks').insert(taskToDb(nextTask, user.id))
            .then(({ error }) => { if (error) console.error('Task insert error:', error) })
        }
      } else {
        // One-time task: award XP once
        const xpAmount = getXPForTask(task.priority)
        if (!task.xpAwarded) {
          task.categories.forEach(catId => awardXP(catId, xpAmount))
        }
        const completedAt = new Date().toISOString()
        setTasks(prev => prev.map(t =>
          t.id === taskId
            ? { ...t, status: 'done', completed: true, completedAt, xpAwarded: true }
            : t
        ))
        supabase.from('tasks').update({
          status:       'done',
          completed:    true,
          completed_at: completedAt,
          xp_awarded:   true,
        }).eq('id', taskId).then(({ error }) => { if (error) console.error('Task move error:', error) })
      }
    } else if (newStatus !== 'done' && task.status === 'done') {
      // Moving out of done → uncomplete
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, status: newStatus, completed: false, completedAt: null } : t
      ))
      supabase.from('tasks').update({
        status:       newStatus,
        completed:    false,
        completed_at: null,
      }).eq('id', taskId).then(({ error }) => { if (error) console.error('Task move error:', error) })
    } else {
      // Simple status change (no completion logic)
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, status: newStatus } : t
      ))
      supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
        .then(({ error }) => { if (error) console.error('Task move error:', error) })
    }
  }, [tasks, awardXP, user.id])

  const reorderColumn = useCallback((activeId, overId) => {
    setTasks(prev => {
      const oldIndex = prev.findIndex(t => t.id === activeId)
      const newIndex = prev.findIndex(t => t.id === overId)
      if (oldIndex === -1 || newIndex === -1) return prev
      return arrayMove(prev, oldIndex, newIndex)
    })
  }, [])

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
      moveTask,
      reorderColumn,
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
