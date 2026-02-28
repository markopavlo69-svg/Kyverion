import { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { supabase } from '@lib/supabase'
import { useAuth } from './AuthContext'
import { useXP } from '@context/XPContext'

const LearningContext = createContext(null)

function genId() {
  return String(Date.now()) + '_' + Math.random().toString(36).slice(2, 9)
}
function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

export function LearningProvider({ children }) {
  const { user }    = useAuth()
  const { awardXP } = useXP()

  const [areas,         setAreas]         = useState([])
  const [activeSession, setActiveSession] = useState(null)

  // ── Load all areas + nested data ──────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const [areasRes, notesRes, linksRes, sessionsRes] = await Promise.all([
        supabase.from('learning_areas').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('learning_notes').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('learning_links').select('*').eq('user_id', user.id).order('added_at'),
        supabase.from('learning_sessions').select('*').eq('user_id', user.id).order('created_at'),
      ])
      if (areasRes.error) { console.error('Areas load error:', areasRes.error); return }

      const notesByArea = {}, linksByArea = {}, sessionsByArea = {}
      for (const n of notesRes.data ?? []) {
        if (!notesByArea[n.area_id]) notesByArea[n.area_id] = []
        notesByArea[n.area_id].push({
          id: n.id, title: n.title, content: n.content,
          images: [], createdAt: n.created_at, updatedAt: n.updated_at,
        })
      }
      for (const l of linksRes.data ?? []) {
        if (!linksByArea[l.area_id]) linksByArea[l.area_id] = []
        linksByArea[l.area_id].push({ id: l.id, title: l.title, url: l.url, addedAt: l.added_at })
      }
      for (const s of sessionsRes.data ?? []) {
        if (!sessionsByArea[s.area_id]) sessionsByArea[s.area_id] = []
        sessionsByArea[s.area_id].push({
          id: s.id, startedAt: s.started_at, endedAt: s.ended_at,
          durationSeconds: s.duration_seconds, xpAwarded: s.xp_awarded, date: s.date,
        })
      }

      setAreas((areasRes.data ?? []).map(a => ({
        id: a.id, name: a.name, icon: a.icon ?? '📚', color: a.color ?? '#00d4ff',
        category: a.category ?? 'intelligence', totalSeconds: a.total_seconds ?? 0,
        createdAt: a.created_at,
        notes:    notesByArea[a.id]    ?? [],
        links:    linksByArea[a.id]    ?? [],
        sessions: sessionsByArea[a.id] ?? [],
      })))
    }
    load()
  }, [user.id])

  // ── Timer tick ────────────────────────────────────────────────────────────
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

  const startSession = useCallback((areaId) => {
    if (activeSession) return
    const area = areas.find(a => a.id === areaId)
    if (!area) return
    setActiveSession({ areaId, areaCategory: area.category, startedAt: Date.now(), elapsed: 0 })
  }, [activeSession, areas])

  const stopSession = useCallback(() => {
    if (!activeSession) return
    const elapsed  = Math.floor((Date.now() - activeSession.startedAt) / 1000)
    const xpEarned = Math.floor(elapsed / 60) * 2
    const session  = {
      id: genId(),
      startedAt:       new Date(activeSession.startedAt).toISOString(),
      endedAt:         new Date().toISOString(),
      durationSeconds: elapsed,
      xpAwarded:       xpEarned,
      date:            todayKey(),
    }
    const areaId   = activeSession.areaId
    const area     = areas.find(a => a.id === areaId)
    const newTotal = (area?.totalSeconds ?? 0) + elapsed

    setAreas(prev => prev.map(a =>
      a.id !== areaId ? a : {
        ...a,
        sessions:     [...(a.sessions ?? []), session],
        totalSeconds: newTotal,
      }
    ))

    supabase.from('learning_sessions').insert({
      id: session.id, area_id: areaId, user_id: user.id,
      started_at: session.startedAt, ended_at: session.endedAt,
      duration_seconds: elapsed, xp_awarded: xpEarned, date: session.date,
    }).then(({ error }) => { if (error) console.error('Session insert error:', error) })

    supabase.from('learning_areas').update({ total_seconds: newTotal }).eq('id', areaId)
      .then(({ error }) => { if (error) console.error('Area total_seconds error:', error) })

    if (xpEarned > 0) awardXP(activeSession.areaCategory, xpEarned)
    setActiveSession(null)
  }, [activeSession, areas, awardXP, user.id])

  // ── Log a session directly (AI-triggered, no timer) ──────────────────────
  const logSession = useCallback((areaId, durationMinutes) => {
    const durationSeconds = Math.round(Math.max(1, durationMinutes) * 60)
    const xpEarned        = Math.floor(durationMinutes) * 2
    const area            = areas.find(a => a.id === areaId)
    if (!area) { console.warn('logSession: area not found', areaId); return null }
    const session = {
      id:              genId(),
      startedAt:       new Date().toISOString(),
      endedAt:         new Date().toISOString(),
      durationSeconds,
      xpAwarded:       xpEarned,
      date:            todayKey(),
    }
    const newTotal = (area.totalSeconds ?? 0) + durationSeconds

    setAreas(prev => prev.map(a =>
      a.id !== areaId ? a : { ...a, sessions: [...(a.sessions ?? []), session], totalSeconds: newTotal }
    ))

    supabase.from('learning_sessions').insert({
      id: session.id, area_id: areaId, user_id: user.id,
      started_at: session.startedAt, ended_at: session.endedAt,
      duration_seconds: durationSeconds, xp_awarded: xpEarned, date: session.date,
    }).then(({ error }) => { if (error) console.error('logSession insert error:', error) })

    supabase.from('learning_areas').update({ total_seconds: newTotal }).eq('id', areaId)
      .then(({ error }) => { if (error) console.error('logSession area update error:', error) })

    if (xpEarned > 0) awardXP(area.category ?? 'intelligence', xpEarned)
    return session.id
  }, [areas, awardXP, user.id])

  // ── Area CRUD ─────────────────────────────────────────────────────────────
  const addArea = useCallback((area) => {
    const newArea = {
      id: genId(), name: area.name, icon: area.icon ?? '📚',
      color: area.color ?? '#00d4ff', category: area.category ?? 'intelligence',
      totalSeconds: 0, createdAt: new Date().toISOString(),
      notes: [], links: [], sessions: [],
    }
    setAreas(prev => [...prev, newArea])
    supabase.from('learning_areas').insert({
      id: newArea.id, user_id: user.id, name: newArea.name, icon: newArea.icon,
      color: newArea.color, category: newArea.category, total_seconds: 0, created_at: newArea.createdAt,
    }).then(({ error }) => { if (error) console.error('Area insert error:', error) })
    return newArea.id
  }, [user.id])

  const updateArea = useCallback((id, updates) => {
    setAreas(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a))
    const db = {}
    if ('name'     in updates) db.name     = updates.name
    if ('icon'     in updates) db.icon     = updates.icon
    if ('color'    in updates) db.color    = updates.color
    if ('category' in updates) db.category = updates.category
    supabase.from('learning_areas').update(db).eq('id', id)
      .then(({ error }) => { if (error) console.error('Area update error:', error) })
  }, [])

  const deleteArea = useCallback((id) => {
    setAreas(prev => prev.filter(a => a.id !== id))
    if (activeSession?.areaId === id) setActiveSession(null)
    supabase.from('learning_areas').delete().eq('id', id)
      .then(({ error }) => { if (error) console.error('Area delete error:', error) })
  }, [activeSession])

  // ── Note CRUD ─────────────────────────────────────────────────────────────
  const addNote = useCallback((areaId, note) => {
    const newNote = {
      id: genId(), title: note.title ?? 'Untitled', content: note.content ?? '',
      images: note.images ?? [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    setAreas(prev => prev.map(a =>
      a.id === areaId ? { ...a, notes: [...(a.notes ?? []), newNote] } : a
    ))
    supabase.from('learning_notes').insert({
      id: newNote.id, area_id: areaId, user_id: user.id,
      title: newNote.title, content: newNote.content,
      created_at: newNote.createdAt, updated_at: newNote.updatedAt,
    }).then(({ error }) => { if (error) console.error('Note insert error:', error) })
    return newNote.id
  }, [user.id])

  const updateNote = useCallback((areaId, noteId, updates) => {
    const updatedAt = new Date().toISOString()
    setAreas(prev => prev.map(a =>
      a.id !== areaId ? a : {
        ...a,
        notes: (a.notes ?? []).map(n =>
          n.id === noteId ? { ...n, ...updates, updatedAt } : n
        ),
      }
    ))
    const db = { updated_at: updatedAt }
    if ('title'   in updates) db.title   = updates.title
    if ('content' in updates) db.content = updates.content
    supabase.from('learning_notes').update(db).eq('id', noteId)
      .then(({ error }) => { if (error) console.error('Note update error:', error) })
  }, [])

  const deleteNote = useCallback((areaId, noteId) => {
    setAreas(prev => prev.map(a =>
      a.id === areaId ? { ...a, notes: (a.notes ?? []).filter(n => n.id !== noteId) } : a
    ))
    supabase.from('learning_notes').delete().eq('id', noteId)
      .then(({ error }) => { if (error) console.error('Note delete error:', error) })
  }, [])

  // ── Link CRUD ─────────────────────────────────────────────────────────────
  const addLink = useCallback((areaId, link) => {
    const newLink = { id: genId(), title: link.title ?? link.url, url: link.url, addedAt: new Date().toISOString() }
    setAreas(prev => prev.map(a =>
      a.id === areaId ? { ...a, links: [...(a.links ?? []), newLink] } : a
    ))
    supabase.from('learning_links').insert({
      id: newLink.id, area_id: areaId, user_id: user.id,
      title: newLink.title, url: newLink.url, added_at: newLink.addedAt,
    }).then(({ error }) => { if (error) console.error('Link insert error:', error) })
  }, [user.id])

  const deleteLink = useCallback((areaId, linkId) => {
    setAreas(prev => prev.map(a =>
      a.id === areaId ? { ...a, links: (a.links ?? []).filter(l => l.id !== linkId) } : a
    ))
    supabase.from('learning_links').delete().eq('id', linkId)
      .then(({ error }) => { if (error) console.error('Link delete error:', error) })
  }, [])

  // ── Stats ─────────────────────────────────────────────────────────────────
  const getAreaStats = useCallback((areaId) => {
    const area = areas.find(a => a.id === areaId)
    if (!area) return { todaySeconds: 0, totalSeconds: 0, totalXP: 0 }
    const today        = todayKey()
    const todaySeconds = (area.sessions ?? []).filter(s => s.date === today).reduce((sum, s) => sum + s.durationSeconds, 0)
    const totalXP      = (area.sessions ?? []).reduce((sum, s) => sum + (s.xpAwarded ?? 0), 0)
    return { todaySeconds, totalSeconds: area.totalSeconds ?? 0, totalXP }
  }, [areas])

  const getTotalStats = useCallback(() => {
    const today = todayKey()
    let todaySeconds = 0, totalSeconds = 0, totalXP = 0
    for (const area of areas) {
      for (const s of area.sessions ?? []) {
        if (s.date === today) todaySeconds += s.durationSeconds
        totalSeconds += s.durationSeconds
        totalXP      += s.xpAwarded ?? 0
      }
    }
    return { todaySeconds, totalSeconds, totalXP }
  }, [areas])

  const value = {
    areas, activeSession, startSession, stopSession, logSession,
    addArea, updateArea, deleteArea,
    addNote, updateNote, deleteNote,
    addLink, deleteLink,
    getAreaStats, getTotalStats,
  }

  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>
}

export function useLearning() {
  const ctx = useContext(LearningContext)
  if (!ctx) throw new Error('useLearning must be used within LearningProvider')
  return ctx
}
