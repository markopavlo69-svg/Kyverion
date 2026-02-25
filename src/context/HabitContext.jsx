import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@lib/supabase'
import { useAuth } from './AuthContext'
import { useXP } from './XPContext'
import { getXPForHabit, getStreakBonusXP, HABIT_MASTERY_THRESHOLD } from '@utils/xpCalculator'
import { getTodayString, offsetDate, getISOWeekKey } from '@utils/dateUtils'

const HabitContext = createContext(null)

function computeStreak(completions) {
  if (!completions || completions.length === 0) return 0
  const dates     = new Set(completions.map(c => c.date))
  const today     = getTodayString()
  const yesterday = offsetDate(today, -1)

  let start = dates.has(today) ? today : dates.has(yesterday) ? yesterday : null
  if (!start) return 0

  let streak = 0, current = start
  while (dates.has(current)) { streak++; current = offsetDate(current, -1) }
  return streak
}

function computeWeeklyStreak(completions) {
  if (!completions || completions.length === 0) return 0
  const weekSet    = new Set(completions.map(c => getISOWeekKey(c.date)))
  const today      = getTodayString()
  const thisWeek   = getISOWeekKey(today)
  const lastWeek   = getISOWeekKey(offsetDate(today, -7))

  let startWeek = weekSet.has(thisWeek) ? thisWeek : weekSet.has(lastWeek) ? lastWeek : null
  if (!startWeek) return 0

  // Walk back week by week
  let streak = 0
  let checkDate = weekSet.has(thisWeek) ? today : offsetDate(today, -7)
  while (weekSet.has(getISOWeekKey(checkDate))) {
    streak++
    checkDate = offsetDate(checkDate, -7)
  }
  return streak
}

export function HabitProvider({ children }) {
  const { user }   = useAuth()
  const { awardXP } = useXP()
  const [habits, setHabits] = useState([])

  // ── Load habits + completions ───────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const [habitsRes, completionsRes] = await Promise.all([
        supabase.from('habits').select('*').eq('user_id', user.id).eq('active', true),
        supabase.from('habit_completions').select('*').eq('user_id', user.id),
      ])

      if (habitsRes.error)      { console.error('Habits load error:', habitsRes.error); return }
      if (completionsRes.error) { console.error('Completions load error:', completionsRes.error); return }

      // Group completions by habit
      const byHabit = {}
      for (const c of completionsRes.data ?? []) {
        if (!byHabit[c.habit_id]) byHabit[c.habit_id] = []
        byHabit[c.habit_id].push({ date: c.date, completedAt: c.completed_at })
      }

      setHabits((habitsRes.data ?? []).map(h => ({
        id:            h.id,
        name:          h.name,
        description:   h.description   ?? '',
        category:      h.category,
        frequency:     h.frequency      ?? 'daily',
        longestStreak: h.longest_streak ?? 0,
        active:        h.active,
        createdAt:     h.created_at,
        completions:   byHabit[h.id]   ?? [],
      })))
    }
    load()
  }, [user.id])

  // Live-computed streaks (daily or weekly based on frequency)
  const activeHabits = useMemo(() =>
    habits.map(h => ({
      ...h,
      currentStreak: h.frequency === 'weekly'
        ? computeWeeklyStreak(h.completions)
        : computeStreak(h.completions),
    })),
    [habits]
  )

  // ── CRUD ────────────────────────────────────────────────────────────────────
  const addHabit = useCallback((data) => {
    const newHabit = {
      id:            `habit_${Date.now()}`,
      name:          data.name.trim(),
      description:   data.description?.trim() ?? '',
      category:      data.category,
      frequency:     data.frequency ?? 'daily',
      longestStreak: 0,
      active:        true,
      createdAt:     new Date().toISOString(),
      completions:   [],
    }
    setHabits(prev => [newHabit, ...prev])
    supabase.from('habits').insert({
      id:             newHabit.id,
      user_id:        user.id,
      name:           newHabit.name,
      description:    newHabit.description,
      category:       newHabit.category,
      frequency:      newHabit.frequency,
      longest_streak: newHabit.longestStreak,
      active:         true,
      created_at:     newHabit.createdAt,
    }).then(({ error }) => { if (error) console.error('Habit insert error:', error) })
  }, [user.id])

  const updateHabit = useCallback((id, updates) => {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h))
    const dbUpdates = {}
    if ('name'        in updates) dbUpdates.name        = updates.name
    if ('description' in updates) dbUpdates.description = updates.description
    if ('category'    in updates) dbUpdates.category    = updates.category
    if ('frequency'   in updates) dbUpdates.frequency   = updates.frequency
    supabase.from('habits').update(dbUpdates).eq('id', id)
      .then(({ error }) => { if (error) console.error('Habit update error:', error) })
  }, [])

  const deleteHabit = useCallback((id) => {
    setHabits(prev => prev.filter(h => h.id !== id))
    supabase.from('habits').update({ active: false }).eq('id', id)
      .then(({ error }) => { if (error) console.error('Habit delete error:', error) })
  }, [])

  const completeHabitToday = useCallback((id) => {
    const today = getTodayString()
    const habit = habits.find(h => h.id === id)
    if (!habit) return
    // For weekly habits: already done if completed any day this week
    if (habit.frequency === 'weekly') {
      const thisWeek = getISOWeekKey(today)
      if (habit.completions.some(c => getISOWeekKey(c.date) === thisWeek)) return
    } else {
      if (habit.completions.some(c => c.date === today)) return
    }

    const newCompletion  = { date: today, completedAt: new Date().toISOString() }
    const newCompletions = [...habit.completions, newCompletion]
    const newStreak      = computeStreak(newCompletions)
    const newLongest     = Math.max(habit.longestStreak ?? 0, newStreak)

    // Award XP — reduced to maintenance rate once habit is mastered (longestStreak >= 90)
    const isMastered = (habit.longestStreak ?? 0) >= HABIT_MASTERY_THRESHOLD
    awardXP(habit.category, getXPForHabit(isMastered))
    const bonus = getStreakBonusXP(newStreak)
    if (bonus > 0) awardXP(habit.category, bonus)

    setHabits(prev => prev.map(h =>
      h.id === id
        ? { ...h, completions: newCompletions, currentStreak: newStreak, longestStreak: newLongest }
        : h
    ))

    supabase.from('habit_completions').insert({
      habit_id:     id,
      user_id:      user.id,
      date:         today,
      completed_at: newCompletion.completedAt,
    }).then(({ error }) => { if (error) console.error('Completion insert error:', error) })

    if (newLongest > (habit.longestStreak ?? 0)) {
      supabase.from('habits').update({ longest_streak: newLongest }).eq('id', id)
        .then(({ error }) => { if (error) console.error('Streak update error:', error) })
    }
  }, [habits, awardXP, user.id])

  const isHabitCompletedOnDate = useCallback((habitId, dateStr) => {
    const habit = habits.find(h => h.id === habitId)
    return habit ? habit.completions.some(c => c.date === dateStr) : false
  }, [habits])

  const getAllHabitsStatusForDate = useCallback((dateStr) => {
    const weekKey = getISOWeekKey(dateStr)
    return activeHabits.map(h => ({
      habitId:   h.id,
      name:      h.name,
      category:  h.category,
      frequency: h.frequency,
      completed: h.frequency === 'weekly'
        ? h.completions.some(c => getISOWeekKey(c.date) === weekKey)
        : h.completions.some(c => c.date === dateStr),
    }))
  }, [activeHabits])

  return (
    <HabitContext.Provider value={{
      habits: activeHabits,
      addHabit,
      updateHabit,
      deleteHabit,
      completeHabitToday,
      isHabitCompletedOnDate,
      getAllHabitsStatusForDate,
    }}>
      {children}
    </HabitContext.Provider>
  )
}

export function useHabits() {
  const ctx = useContext(HabitContext)
  if (!ctx) throw new Error('useHabits must be used within HabitProvider')
  return ctx
}
