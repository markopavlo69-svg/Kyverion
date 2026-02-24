import { createContext, useContext, useCallback, useRef } from 'react'
import { useLocalStorage } from '@hooks/useLocalStorage'
import { useXP } from './XPContext'

// XP milestones awarded to the "vitality" category
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
  const { awardXP } = useXP()

  const [settings, setSettings]                     = useLocalStorage('kyverion_nosmoke_settings', {})
  const [log, setLog]                               = useLocalStorage('kyverion_nosmoke_log', [])
  const [record, setRecord]                         = useLocalStorage('kyverion_nosmoke_record', 0)
  const [startTime, setStartTime]                   = useLocalStorage('kyverion_nosmoke_start', null)
  const [milestonesAwarded, setMilestonesAwarded]   = useLocalStorage('kyverion_nosmoke_milestones', [])

  // Ref-based guard: prevents double-awarding even in React strict mode double-invoke
  const awardedRef = useRef(new Set(milestonesAwarded))

  // Set start timestamp only once (on first page visit or first settings save)
  const ensureStarted = useCallback(() => {
    setStartTime(prev => prev ?? Date.now())
  }, [setStartTime])

  const saveSettings = useCallback((newSettings) => {
    setSettings(newSettings)
    setStartTime(prev => prev ?? Date.now())
  }, [setSettings, setStartTime])

  // Seconds since last cigarette (or since start if none logged yet)
  const getCurrentStreak = useCallback((now = Date.now()) => {
    if (log.length === 0) {
      const start = startTime || 0
      return start > 0 ? Math.floor((now - start) / 1000) : 0
    }
    return Math.floor((now - log[log.length - 1]) / 1000)
  }, [log, startTime])

  // Award XP for time milestones — safe to call every second (ref guards duplicates)
  const checkMilestones = useCallback((streakSeconds) => {
    NS_MILESTONES.forEach(m => {
      if (streakSeconds >= m.seconds && !awardedRef.current.has(m.seconds)) {
        awardedRef.current.add(m.seconds)           // sync guard
        awardXP('vitality', m.xp)
        setMilestonesAwarded(prev => [...prev, m.seconds])
      }
    })
  }, [awardXP, setMilestonesAwarded])

  // Record a smoked cigarette — saves record streak, resets milestones
  const logSmoke = useCallback(() => {
    const streak = getCurrentStreak()
    if (streak > record) setRecord(streak)
    awardedRef.current.clear()
    setMilestonesAwarded([])
    setLog(prev => [...prev, Date.now()])
  }, [getCurrentStreak, record, setRecord, setMilestonesAwarded, setLog])

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
