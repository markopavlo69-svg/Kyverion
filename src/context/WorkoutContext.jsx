import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { supabase }    from '@lib/supabase'
import { useAuth }     from './AuthContext'
import { useXP }       from './XPContext'
import { getStreakBonusXP } from '@utils/xpCalculator'

const WorkoutContext = createContext(null)

function genId() {
  return String(Date.now()) + '_' + Math.random().toString(36).slice(2, 9)
}
function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

// ── XP helpers ────────────────────────────────────────────────────────────────
// 2 XP per set, capped at 60 per session
function calcBaseXP(exercises) {
  const totalSets = exercises.reduce((sum, ex) => sum + (ex.sets?.length ?? 0), 0)
  return Math.min(60, Math.max(10, totalSets * 2))
}

export function WorkoutProvider({ children }) {
  const { user }    = useAuth()
  const { awardXP } = useXP()

  const [sessions,  setSessions]  = useState([])   // [{id, category, title, notes, date, xpAwarded, exercises:[]}]
  const [baselines, setBaselines] = useState({})   // { exercise_name: {id, reps, weight, unit, notes} }
  const [loading,   setLoading]   = useState(true)

  // ── Load from Supabase ────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)
      const [sessRes, exRes, baseRes] = await Promise.all([
        supabase.from('workout_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false }),
        supabase.from('workout_exercises')
          .select('*')
          .eq('user_id', user.id)
          .order('order_index'),
        supabase.from('workout_baselines')
          .select('*')
          .eq('user_id', user.id),
      ])

      if (sessRes.error) { console.error('Workout sessions load error:', sessRes.error); setLoading(false); return }

      const exercisesBySession = {}
      for (const ex of exRes.data ?? []) {
        if (!exercisesBySession[ex.session_id]) exercisesBySession[ex.session_id] = []
        exercisesBySession[ex.session_id].push({
          id: ex.id,
          name: ex.exercise_name,
          sets: ex.sets ?? [],
          orderIndex: ex.order_index,
        })
      }

      setSessions(
        (sessRes.data ?? []).map(s => ({
          id: s.id,
          category:   s.category,
          title:      s.title,
          notes:      s.notes ?? '',
          date:       s.date,
          xpAwarded:  s.xp_awarded ?? 0,
          createdAt:  s.created_at,
          exercises:  exercisesBySession[s.id] ?? [],
        }))
      )

      const baseMap = {}
      for (const b of baseRes.data ?? []) {
        baseMap[b.exercise_name] = {
          id:     b.id,
          reps:   b.reps,
          weight: b.weight,
          unit:   b.unit ?? 'kg',
          notes:  b.notes ?? '',
          updatedAt: b.updated_at,
        }
      }
      setBaselines(baseMap)
      setLoading(false)
    }
    load()
  }, [user.id])

  // ── Computed: personal records ────────────────────────────────────────────
  // PR = max weight per exercise (ties broken by max reps at that weight)
  const prs = useMemo(() => {
    const map = {} // exerciseName → {weight, reps, sessionId, date}
    for (const session of sessions) {
      for (const ex of session.exercises) {
        for (const set of ex.sets ?? []) {
          const w = parseFloat(set.weight) || 0
          const r = parseInt(set.reps, 10) || 0
          if (!map[ex.name] || w > map[ex.name].weight || (w === map[ex.name].weight && r > map[ex.name].reps)) {
            map[ex.name] = { weight: w, reps: r, unit: set.unit || 'kg', sessionId: session.id, date: session.date }
          }
        }
      }
    }
    return map
  }, [sessions])

  // ── Computed: consecutive-day streak (today or yesterday counts) ──────────
  const streak = useMemo(() => {
    const dates = [...new Set(sessions.map(s => s.date))].sort().reverse()
    if (dates.length === 0) return 0
    let count = 0
    let check = todayKey()
    // Allow streak to start from yesterday if no session today
    if (dates[0] !== check) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yd = yesterday.toISOString().slice(0, 10)
      if (dates[0] !== yd) return 0
      check = yd
    }
    for (const d of dates) {
      if (d === check) {
        count++
        const prev = new Date(check + 'T00:00:00')
        prev.setDate(prev.getDate() - 1)
        check = prev.toISOString().slice(0, 10)
      } else {
        break
      }
    }
    return count
  }, [sessions])

  // ── Computed: weekly activity for chart ───────────────────────────────────
  const getWeeklyActivity = useCallback((weeks = 8) => {
    const result = []
    const now = new Date()
    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay() - i * 7)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      const startStr = weekStart.toISOString().slice(0, 10)
      const endStr   = weekEnd.toISOString().slice(0, 10)
      const count = sessions.filter(s => s.date >= startStr && s.date <= endStr).length
      result.push({ weekStart: startStr, weekEnd: endStr, count })
    }
    return result
  }, [sessions])

  // ── Detect new PRs in a just-added session ────────────────────────────────
  // Returns {exerciseName} array of exercises that set new PRs
  const detectNewPRs = useCallback((exercises, prevPRs) => {
    const newPRs = []
    for (const ex of exercises) {
      const prevBest = prevPRs[ex.name]
      for (const set of ex.sets ?? []) {
        const w = parseFloat(set.weight) || 0
        const r = parseInt(set.reps, 10) || 0
        if (!prevBest || w > prevBest.weight || (w === prevBest.weight && r > prevBest.reps)) {
          if (!newPRs.includes(ex.name)) newPRs.push(ex.name)
        }
      }
    }
    return newPRs
  }, [])

  // ── Add session ───────────────────────────────────────────────────────────
  const addSession = useCallback(async (category, title, notes, date, exercises) => {
    const sessionId = genId()
    const baseXP    = calcBaseXP(exercises)
    const newPRs    = detectNewPRs(exercises, prs)
    const prXP      = newPRs.length * 50

    const currentStreak = streak + 1 // after adding today's session
    const streakBonus   = getStreakBonusXP(currentStreak)
    const totalXP       = baseXP + prXP + streakBonus

    const newExercises = exercises.map((ex, i) => ({
      id:         genId(),
      name:       ex.name,
      sets:       ex.sets ?? [],
      orderIndex: i,
    }))

    const newSession = {
      id: sessionId,
      category,
      title:     title || `${category.charAt(0).toUpperCase() + category.slice(1)} Session`,
      notes:     notes ?? '',
      date:      date || todayKey(),
      xpAwarded: totalXP,
      createdAt: new Date().toISOString(),
      exercises: newExercises,
    }

    // Optimistic update
    setSessions(prev => [newSession, ...prev])

    // Persist session
    supabase.from('workout_sessions').insert({
      id:         sessionId,
      user_id:    user.id,
      category,
      title:      newSession.title,
      notes:      newSession.notes,
      date:       newSession.date,
      xp_awarded: totalXP,
    }).then(({ error }) => { if (error) console.error('Session insert error:', error) })

    // Persist exercises
    if (newExercises.length > 0) {
      supabase.from('workout_exercises').insert(
        newExercises.map(ex => ({
          id:            ex.id,
          session_id:    sessionId,
          user_id:       user.id,
          exercise_name: ex.name,
          sets:          ex.sets,
          order_index:   ex.orderIndex,
        }))
      ).then(({ error }) => { if (error) console.error('Exercises insert error:', error) })
    }

    // Award XP
    if (baseXP > 0) awardXP('strength', baseXP)
    if (prXP > 0) {
      for (let i = 0; i < newPRs.length; i++) awardXP('strength', 50)
    }
    if (streakBonus > 0) awardXP('strength', streakBonus)

    return { sessionId, newPRs, xpAwarded: totalXP }
  }, [prs, streak, detectNewPRs, awardXP, user.id])

  // ── Add empty session (AI action) ─────────────────────────────────────────
  const addEmptyWorkout = useCallback(async (title, category = 'other') => {
    const cat = ['calisthenics', 'gym', 'other'].includes(category) ? category : 'other'
    return addSession(cat, title || `${cat.charAt(0).toUpperCase() + cat.slice(1)} Session`, '', todayKey(), [])
  }, [addSession])

  // ── Delete session ────────────────────────────────────────────────────────
  const deleteSession = useCallback((id) => {
    setSessions(prev => prev.filter(s => s.id !== id))
    supabase.from('workout_sessions').delete().eq('id', id)
      .then(({ error }) => { if (error) console.error('Session delete error:', error) })
  }, [])

  // ── Set baseline ──────────────────────────────────────────────────────────
  const setBaseline = useCallback((exerciseName, reps, weight, unit, notes) => {
    const existing = baselines[exerciseName]
    const id = existing?.id || genId()
    const updated = { id, reps, weight, unit: unit || 'kg', notes: notes || '', updatedAt: new Date().toISOString() }
    setBaselines(prev => ({ ...prev, [exerciseName]: updated }))
    supabase.from('workout_baselines').upsert({
      id,
      user_id:       user.id,
      exercise_name: exerciseName,
      reps,
      weight,
      unit:          unit || 'kg',
      notes:         notes || '',
      updated_at:    updated.updatedAt,
    }, { onConflict: 'user_id,exercise_name' })
      .then(({ error }) => { if (error) console.error('Baseline upsert error:', error) })
  }, [baselines, user.id])

  const deleteBaseline = useCallback((exerciseName) => {
    const baseline = baselines[exerciseName]
    if (!baseline) return
    setBaselines(prev => {
      const next = { ...prev }
      delete next[exerciseName]
      return next
    })
    supabase.from('workout_baselines').delete().eq('id', baseline.id)
      .then(({ error }) => { if (error) console.error('Baseline delete error:', error) })
  }, [baselines])

  // ── Helper: all unique exercise names ever logged ─────────────────────────
  const allExerciseNames = useMemo(() => {
    const names = new Set()
    for (const s of sessions) {
      for (const ex of s.exercises) names.add(ex.name)
    }
    return [...names].sort()
  }, [sessions])

  // ── Helper: sessions for a specific category ──────────────────────────────
  const getSessionsForCategory = useCallback((category) =>
    sessions.filter(s => s.category === category),
  [sessions])

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalSessions = sessions.length
    const totalSets = sessions.reduce((sum, s) =>
      sum + s.exercises.reduce((es, ex) => es + (ex.sets?.length ?? 0), 0), 0)
    const totalPRs = Object.keys(prs).length
    return { totalSessions, totalSets, totalPRs }
  }, [sessions, prs])

  const value = {
    sessions,
    baselines,
    prs,
    streak,
    stats,
    loading,
    addSession,
    addEmptyWorkout,
    deleteSession,
    setBaseline,
    deleteBaseline,
    getSessionsForCategory,
    getWeeklyActivity,
    allExerciseNames,
  }

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>
}

export function useWorkout() {
  const ctx = useContext(WorkoutContext)
  if (!ctx) throw new Error('useWorkout must be used within WorkoutProvider')
  return ctx
}
