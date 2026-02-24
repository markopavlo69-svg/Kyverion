import { createContext, useContext, useCallback, useState } from 'react'
import { useLocalStorage } from '@hooks/useLocalStorage'
import { STORAGE_KEYS } from '@utils/storageKeys'
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
    globalLevel: 1,
    globalTotalXP: 0,
    lastUpdated: new Date().toISOString(),
  }
}

export function XPProvider({ children }) {
  const [xpData, setXPData] = useLocalStorage(STORAGE_KEYS.XP, buildDefaultXP())
  const [toastQueue, setToastQueue] = useState([])

  const awardXP = useCallback((categoryId, amount) => {
    if (!categoryId || !amount) return

    setXPData(prev => {
      const cats = { ...prev.categories }
      const existing = cats[categoryId] ?? { totalXP: 0, level: 1 }
      const newXP = existing.totalXP + amount
      cats[categoryId] = {
        totalXP: newXP,
        level: levelFromXP(newXP),
      }
      const globalTotalXP = computeGlobalXP(cats)
      return {
        ...prev,
        categories: cats,
        globalLevel: levelFromXP(globalTotalXP),
        globalTotalXP,
        lastUpdated: new Date().toISOString(),
      }
    })

    const cat = CATEGORIES[categoryId]
    const toastId = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`
    setToastQueue(prev => [
      ...prev,
      {
        id: toastId,
        xp: amount,
        categoryId,
        category: cat?.name ?? categoryId,
        color: cat?.color ?? '#00d4ff',
      },
    ])
  }, [setXPData])

  const dismissToast = useCallback((id) => {
    setToastQueue(prev => prev.filter(t => t.id !== id))
  }, [])

  const getCategoryData = useCallback((categoryId) => {
    const cat = xpData.categories[categoryId] ?? { totalXP: 0, level: 1 }
    return {
      totalXP: cat.totalXP,
      level: cat.level,
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
