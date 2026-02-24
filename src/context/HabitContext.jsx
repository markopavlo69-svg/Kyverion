import { createContext, useContext, useCallback, useMemo } from 'react'
import { useLocalStorage } from '@hooks/useLocalStorage'
import { STORAGE_KEYS } from '@utils/storageKeys'
import { useXP } from './XPContext'
import { getXPForHabit, getStreakBonusXP } from '@utils/xpCalculator'
import { getTodayString, offsetDate } from '@utils/dateUtils'

const HabitContext = createContext(null)

function computeStreak(completions) {
  if (!completions || completions.length === 0) return 0
  const dates = new Set(completions.map(c => c.date))
  const today     = getTodayString()
  const yesterday = offsetDate(today, -1)

  let start = dates.has(today) ? today : dates.has(yesterday) ? yesterday : null
  if (!start) return 0

  let streak = 0
  let current = start
  while (dates.has(current)) {
    streak++
    current = offsetDate(current, -1)
  }
  return streak
}

export function HabitProvider({ children }) {
  const [habits, setHabits] = useLocalStorage(STORAGE_KEYS.HABITS, [])
  const { awardXP } = useXP()

  // Active habits with live-computed streaks
  const activeHabits = useMemo(() =>
    habits
      .filter(h => h.active !== false)
      .map(h => ({ ...h, currentStreak: computeStreak(h.completions) })),
    [habits]
  )

  const addHabit = useCallback((data) => {
    const newHabit = {
      id:            `habit_${Date.now()}`,
      name:          data.name.trim(),
      description:   data.description?.trim() ?? '',
      category:      data.category,
      frequency:     'daily',
      createdAt:     new Date().toISOString(),
      completions:   [],
      currentStreak: 0,
      longestStreak: 0,
      active:        true,
    }
    setHabits(prev => [newHabit, ...prev])
  }, [setHabits])

  const updateHabit = useCallback((id, updates) => {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h))
  }, [setHabits])

  const deleteHabit = useCallback((id) => {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, active: false } : h))
  }, [setHabits])

  const completeHabitToday = useCallback((id) => {
    const today = getTodayString()
    // Read from current render snapshot — event handlers run once, not twice in StrictMode
    const habit = habits.find(h => h.id === id)
    if (!habit || habit.completions.some(c => c.date === today)) return

    const newCompletions = [
      ...habit.completions,
      { date: today, completedAt: new Date().toISOString() },
    ]
    const newStreak  = computeStreak(newCompletions)
    const newLongest = Math.max(habit.longestStreak ?? 0, newStreak)

    // Award XP outside state updater to avoid StrictMode double-invocation
    awardXP(habit.category, getXPForHabit())
    const bonus = getStreakBonusXP(newStreak)
    if (bonus > 0) awardXP(habit.category, bonus)

    setHabits(prev => prev.map(h =>
      h.id === id
        ? { ...h, completions: newCompletions, currentStreak: newStreak, longestStreak: newLongest }
        : h
    ))
  }, [habits, setHabits, awardXP])

  const isHabitCompletedOnDate = useCallback((habitId, dateStr) => {
    const habit = habits.find(h => h.id === habitId)
    return habit ? habit.completions.some(c => c.date === dateStr) : false
  }, [habits])

  const getAllHabitsStatusForDate = useCallback((dateStr) => {
    return activeHabits.map(h => ({
      habitId:   h.id,
      name:      h.name,
      category:  h.category,
      completed: h.completions.some(c => c.date === dateStr),
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
