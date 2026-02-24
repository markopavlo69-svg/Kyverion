import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react'
import { useLocalStorage } from '@hooks/useLocalStorage'
import { STORAGE_KEYS } from '@utils/storageKeys'
import { useXP } from '@context/XPContext'

const LearningContext = createContext(null)

function genId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

const DEFAULT_STATE = {
  areas: [
    {
      id: genId(),
      name: 'Coding',
      icon: '💻',
      color: '#3b82f6',
      category: 'intelligence',
      notes: [],
      links: [],
      sessions: [],
      totalSeconds: 0,
      createdAt: new Date().toISOString(),
    },
    {
      id: genId(),
      name: 'Art',
      icon: '🎨',
      color: '#a855f7',
      category: 'creativity',
      notes: [],
      links: [],
      sessions: [],
      totalSeconds: 0,
      createdAt: new Date().toISOString(),
    },
  ],
}

export function LearningProvider({ children }) {
  const [data, setData] = useLocalStorage(STORAGE_KEYS.LEARNING, DEFAULT_STATE)
  const { awardXP } = useXP()

  // Active session — not persisted (resets on reload)
  const [activeSession, setActiveSession] = useState(null)
  // { areaId, areaCategory, startedAt (ms), elapsed (seconds) }

  // Tick timer every second while session is active
  const isSessionActive = activeSession !== null
  useEffect(() => {
    if (!isSessionActive) return
    const id = setInterval(() => {
      setActiveSession(prev =>
        prev ? { ...prev, elapsed: Math.floor((Date.now() - prev.startedAt) / 1000) } : null
      )
    }, 1000)
    return () => clearInterval(id)
  }, [isSessionActive])

  // ── Session controls ──────────────────────────────────────────────────────

  const startSession = useCallback((areaId) => {
    if (activeSession) return
    const area = data.areas.find(a => a.id === areaId)
    if (!area) return
    setActiveSession({ areaId, areaCategory: area.category, startedAt: Date.now(), elapsed: 0 })
  }, [activeSession, data.areas])

  const stopSession = useCallback(() => {
    if (!activeSession) return
    const elapsed = Math.floor((Date.now() - activeSession.startedAt) / 1000)
    const minutes = Math.floor(elapsed / 60)
    const xpEarned = minutes * 2 // 2 XP per minute

    const session = {
      id: genId(),
      startedAt: new Date(activeSession.startedAt).toISOString(),
      endedAt: new Date().toISOString(),
      durationSeconds: elapsed,
      xpAwarded: xpEarned,
      date: todayKey(),
    }

    setData(prev => ({
      ...prev,
      areas: prev.areas.map(a =>
        a.id !== activeSession.areaId
          ? a
          : {
              ...a,
              sessions: [...(a.sessions ?? []), session],
              totalSeconds: (a.totalSeconds ?? 0) + elapsed,
            }
      ),
    }))

    if (xpEarned > 0) {
      awardXP(activeSession.areaCategory, xpEarned)
    }

    setActiveSession(null)
  }, [activeSession, awardXP, setData])

  // ── Area CRUD ─────────────────────────────────────────────────────────────

  const addArea = useCallback((area) => {
    const newArea = {
      id: genId(),
      name: area.name,
      icon: area.icon ?? '📚',
      color: area.color ?? '#00d4ff',
      category: area.category ?? 'intelligence',
      notes: [],
      links: [],
      sessions: [],
      totalSeconds: 0,
      createdAt: new Date().toISOString(),
    }
    setData(prev => ({ ...prev, areas: [...prev.areas, newArea] }))
    return newArea.id
  }, [setData])

  const updateArea = useCallback((id, updates) => {
    setData(prev => ({
      ...prev,
      areas: prev.areas.map(a => a.id === id ? { ...a, ...updates } : a),
    }))
  }, [setData])

  const deleteArea = useCallback((id) => {
    setData(prev => ({ ...prev, areas: prev.areas.filter(a => a.id !== id) }))
    if (activeSession?.areaId === id) setActiveSession(null)
  }, [setData, activeSession])

  // ── Note CRUD ─────────────────────────────────────────────────────────────

  const addNote = useCallback((areaId, note) => {
    const newNote = {
      id: genId(),
      title: note.title ?? 'Untitled',
      content: note.content ?? '',
      images: note.images ?? [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setData(prev => ({
      ...prev,
      areas: prev.areas.map(a =>
        a.id === areaId ? { ...a, notes: [...(a.notes ?? []), newNote] } : a
      ),
    }))
    return newNote.id
  }, [setData])

  const updateNote = useCallback((areaId, noteId, updates) => {
    setData(prev => ({
      ...prev,
      areas: prev.areas.map(a =>
        a.id !== areaId
          ? a
          : {
              ...a,
              notes: (a.notes ?? []).map(n =>
                n.id === noteId ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
              ),
            }
      ),
    }))
  }, [setData])

  const deleteNote = useCallback((areaId, noteId) => {
    setData(prev => ({
      ...prev,
      areas: prev.areas.map(a =>
        a.id === areaId ? { ...a, notes: (a.notes ?? []).filter(n => n.id !== noteId) } : a
      ),
    }))
  }, [setData])

  // ── Link CRUD ─────────────────────────────────────────────────────────────

  const addLink = useCallback((areaId, link) => {
    const newLink = {
      id: genId(),
      title: link.title ?? link.url,
      url: link.url,
      addedAt: new Date().toISOString(),
    }
    setData(prev => ({
      ...prev,
      areas: prev.areas.map(a =>
        a.id === areaId ? { ...a, links: [...(a.links ?? []), newLink] } : a
      ),
    }))
  }, [setData])

  const deleteLink = useCallback((areaId, linkId) => {
    setData(prev => ({
      ...prev,
      areas: prev.areas.map(a =>
        a.id === areaId ? { ...a, links: (a.links ?? []).filter(l => l.id !== linkId) } : a
      ),
    }))
  }, [setData])

  // ── Stats helpers ─────────────────────────────────────────────────────────

  const getAreaStats = useCallback((areaId) => {
    const area = data.areas.find(a => a.id === areaId)
    if (!area) return { todaySeconds: 0, totalSeconds: 0, totalXP: 0 }
    const today = todayKey()
    const todaySeconds = (area.sessions ?? [])
      .filter(s => s.date === today)
      .reduce((sum, s) => sum + s.durationSeconds, 0)
    const totalXP = (area.sessions ?? []).reduce((sum, s) => sum + (s.xpAwarded ?? 0), 0)
    return { todaySeconds, totalSeconds: area.totalSeconds ?? 0, totalXP }
  }, [data.areas])

  const getTotalStats = useCallback(() => {
    const today = todayKey()
    let todaySeconds = 0, totalSeconds = 0, totalXP = 0
    for (const area of data.areas) {
      for (const s of area.sessions ?? []) {
        if (s.date === today) todaySeconds += s.durationSeconds
        totalSeconds += s.durationSeconds
        totalXP += s.xpAwarded ?? 0
      }
    }
    return { todaySeconds, totalSeconds, totalXP }
  }, [data.areas])

  const value = {
    areas: data.areas,
    activeSession,
    startSession,
    stopSession,
    addArea,
    updateArea,
    deleteArea,
    addNote,
    updateNote,
    deleteNote,
    addLink,
    deleteLink,
    getAreaStats,
    getTotalStats,
  }

  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>
}

export function useLearning() {
  const ctx = useContext(LearningContext)
  if (!ctx) throw new Error('useLearning must be used within LearningProvider')
  return ctx
}
