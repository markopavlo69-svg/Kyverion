import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@lib/supabase'
import { useAuth } from './AuthContext'
import { useXP } from './XPContext'

export const NS_MILESTONES = [
  { seconds: 3_600,     label: '1 Hour Smoke-Free',   xp: 10  },
  { seconds: 21_600,    label: '6 Hours Smoke-Free',  xp: 25  },
  { seconds: 43_200,    label: '12 Hours Smoke-Free', xp: 50  },
  { seconds: 86_400,    label: '1 Day Smoke-Free',    xp: 100 },
  { seconds: 172_800,   label: '2 Days Smoke-Free',   xp: 150 },
  { seconds: 604_800,   label: '7 Days Smoke-Free',   xp: 300 },
  { seconds: 2_592_000, label: '30 Days Smoke-Free',  xp: 750 },
]

const NoSmokeContext = createContext(null)

export function NoSmokeProvider({ children }) {
  const { user }   = useAuth()
  const { awardXP } = useXP()

  const [settings,          setSettings]          = useState({})
  const [log,               setLog]               = useState([])
  const [record,            setRecord]            = useState(0)
  const [startTime,         setStartTime]         = useState(null)
  const [milestonesAwarded, setMilestonesAwarded] = useState([])

  const awardedRef = useRef(new Set())

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('nosmoke')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) { console.error('NoSmoke load error:', error); return }
      if (!data) return // no row yet

      const ms = data.milestones_awarded ?? []
      setSettings(data.settings             ?? {})
      setLog(data.log                       ?? [])
      setRecord(data.record                 ?? 0)
      setStartTime(data.start_time          ?? null)
      setMilestonesAwarded(ms)
      awardedRef.current = new Set(ms)
    }
    load()
  }, [user.id])

  // ── Persist helper ─────────────────────────────────────────────────────────
  const persist = useCallback((patch) => {
    supabase.from('nosmoke').upsert(
      { user_id: user.id, updated_at: new Date().toISOString(), ...patch },
      { onConflict: 'user_id' }
    ).then(({ error }) => { if (error) console.error('NoSmoke save error:', error) })
  }, [user.id])

  // ── Actions ─────────────────────────────────────────────────────────────────
  const ensureStarted = useCallback(() => {
    if (startTime) return
    const now = Date.now()
    setStartTime(now)
    persist({ start_time: now })
  }, [startTime, persist])

  const saveSettings = useCallback((newSettings) => {
    setSettings(newSettings)
    if (!startTime) {
      const now = Date.now()
      setStartTime(now)
      persist({ settings: newSettings, start_time: now })
    } else {
      persist({ settings: newSettings })
    }
  }, [startTime, persist])

  const getCurrentStreak = useCallback((now = Date.now()) => {
    if (log.length === 0) {
      const start = startTime || 0
      return start > 0 ? Math.floor((now - start) / 1000) : 0
    }
    return Math.floor((now - log[log.length - 1]) / 1000)
  }, [log, startTime])

  const checkMilestones = useCallback((streakSeconds) => {
    NS_MILESTONES.forEach(m => {
      if (streakSeconds >= m.seconds && !awardedRef.current.has(m.seconds)) {
        awardedRef.current.add(m.seconds)
        awardXP('vitality', m.xp)
        setMilestonesAwarded(prev => {
          const next = [...prev, m.seconds]
          persist({ milestones_awarded: next })
          return next
        })
      }
    })
  }, [awardXP, persist])

  const logSmoke = useCallback(() => {
    const streak = getCurrentStreak()
    const newRecord = streak > record ? streak : record
    const newLog    = [...log, Date.now()]
    if (newRecord > record) setRecord(newRecord)
    setLog(newLog)
    awardedRef.current.clear()
    setMilestonesAwarded([])
    persist({ log: newLog, record: newRecord, milestones_awarded: [] })
  }, [getCurrentStreak, record, log, persist])

  return (
    <NoSmokeContext.Provider value={{
      settings,
      log,
      record,
      startTime,
      milestonesAwarded,
      NS_MILESTONES,
      ensureStarted,
      saveSettings,
      logSmoke,
      getCurrentStreak,
      checkMilestones,
    }}>
      {children}
    </NoSmokeContext.Provider>
  )
}

export function useNoSmoke() {
  const ctx = useContext(NoSmokeContext)
  if (!ctx) throw new Error('useNoSmoke must be used within NoSmokeProvider')
  return ctx
}
