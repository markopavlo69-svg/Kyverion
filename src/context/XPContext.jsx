import { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { supabase } from '@lib/supabase'
import { useAuth } from './AuthContext'
import { CATEGORIES } from '@utils/categoryConfig'
import {
  levelFromXP,
  progressPercent,
  xpToNextLevel,
  computeGlobalXP,
} from '@utils/xpCalculator'

const XPContext = createContext(null)

function buildDefaultXP() {
  return {
    categories: Object.fromEntries(
      Object.keys(CATEGORIES).map(id => [id, { totalXP: 0, level: 1 }])
    ),
    globalLevel:    1,
    globalTotalXP:  0,
    lastUpdated:    new Date().toISOString(),
  }
}

export function XPProvider({ children }) {
  const { user } = useAuth()
  const [xpData, setXPData]       = useState(buildDefaultXP())
  const [toastQueue, setToastQueue] = useState([])

  // ── Load from Supabase on mount ────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('xp_data')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) { console.error('XP load error:', error); return }

      if (data) {
        const cats = data.categories ?? {}
        const globalTotalXP = computeGlobalXP(cats)
        setXPData({
          categories:   cats,
          globalLevel:  levelFromXP(globalTotalXP),
          globalTotalXP,
          lastUpdated:  data.last_updated,
        })
      }
      // If no row yet, keep defaults — row is created on first awardXP
    }
    load()
  }, [user.id])

  // ── Award XP ───────────────────────────────────────────────────────────────
  const awardXP = useCallback((categoryId, amount) => {
    if (!categoryId || !amount) return

    setXPData(prev => {
      const cats    = { ...prev.categories }
      const existing = cats[categoryId] ?? { totalXP: 0, level: 1 }
      const newXP   = existing.totalXP + amount
      cats[categoryId] = { totalXP: newXP, level: levelFromXP(newXP) }

      const globalTotalXP = computeGlobalXP(cats)
      const next = {
        ...prev,
        categories:   cats,
        globalLevel:  levelFromXP(globalTotalXP),
        globalTotalXP,
        lastUpdated:  new Date().toISOString(),
      }

      // Persist to Supabase (fire-and-forget; cumulative so safe to retry)
      supabase.from('xp_data').upsert(
        {
          user_id:        user.id,
          categories:     cats,
          global_level:   levelFromXP(globalTotalXP),
          global_total_xp: globalTotalXP,
          last_updated:   next.lastUpdated,
        },
        { onConflict: 'user_id' }
      ).then(({ error }) => { if (error) console.error('XP save error:', error) })

      return next
    })

    const cat    = CATEGORIES[categoryId]
    const toastId = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`
    setToastQueue(prev => [
      ...prev,
      {
        id:         toastId,
        xp:         amount,
        categoryId,
        category:   cat?.name ?? categoryId,
        color:      cat?.color ?? '#00d4ff',
      },
    ])
  }, [user.id])

  const dismissToast = useCallback((id) => {
    setToastQueue(prev => prev.filter(t => t.id !== id))
  }, [])

  const getCategoryData = useCallback((categoryId) => {
    const cat = xpData.categories[categoryId] ?? { totalXP: 0, level: 1 }
    return {
      totalXP:  cat.totalXP,
      level:    cat.level,
      progress: progressPercent(cat.totalXP),
      xpToNext: xpToNextLevel(cat.totalXP),
    }
  }, [xpData])

  return (
    <XPContext.Provider value={{ xpData, awardXP, toastQueue, dismissToast, getCategoryData }}>
      {children}
    </XPContext.Provider>
  )
}

export function useXP() {
  const ctx = useContext(XPContext)
  if (!ctx) throw new Error('useXP must be used within XPProvider')
  return ctx
}
