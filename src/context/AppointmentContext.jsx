import { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { supabase } from '@lib/supabase'
import { useAuth } from './AuthContext'

const AppointmentContext = createContext(null)

// Recurrence is encoded as "[R:type]\n" prefix in the description column
function dbToAppt(row) {
  const rawDesc = row.description ?? ''
  const match   = rawDesc.match(/^\[R:(\w+)\]\n?/)
  return {
    id:          row.id,
    title:       row.title,
    description: match ? rawDesc.slice(match[0].length) : rawDesc,
    date:        row.date,
    time:        row.time        ?? '',
    endTime:     row.end_time    ?? '',
    location:    row.location    ?? '',
    color:       row.color       ?? '#00d4ff',
    recurrence:  match ? match[1] : null, // null | 'daily' | 'weekly' | 'monthly' | 'yearly'
    createdAt:   row.created_at,
  }
}

function encodeDescription(description, recurrence) {
  const clean = (description ?? '').trim()
  if (!recurrence) return clean
  return `[R:${recurrence}]\n${clean}`
}

// Does a recurring appointment occur on dateStr?
function doesRecurOn(appt, dateStr) {
  if (dateStr < appt.date) return false  // before first occurrence
  if (dateStr === appt.date) return true

  const origin = new Date(appt.date + 'T00:00:00')
  const target = new Date(dateStr    + 'T00:00:00')
  const diffMs = target - origin
  const diffDays = Math.round(diffMs / 86400000)

  switch (appt.recurrence) {
    case 'daily':
      return true
    case 'weekly':
      return diffDays % 7 === 0
    case 'monthly':
      return origin.getDate() === target.getDate()
    case 'yearly':
      return origin.getMonth() === target.getMonth() && origin.getDate() === target.getDate()
    default:
      return false
  }
}

export function AppointmentProvider({ children }) {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState([])

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true })

      if (error) { console.error('Appointments load error:', error); return }
      setAppointments((data ?? []).map(dbToAppt))
    }
    load()
  }, [user.id])

  // ── CRUD ────────────────────────────────────────────────────────────────────
  const addAppointment = useCallback((data) => {
    const newAppt = {
      id:          `appt_${Date.now()}`,
      title:       data.title.trim(),
      description: data.description?.trim() ?? '',
      date:        data.date,
      time:        data.time     || '',
      endTime:     data.endTime  || '',
      location:    data.location?.trim() ?? '',
      color:       data.color    || '#00d4ff',
      recurrence:  data.recurrence || null,
      createdAt:   new Date().toISOString(),
    }
    setAppointments(prev => [...prev, newAppt])
    supabase.from('appointments').insert({
      id:          newAppt.id,
      user_id:     user.id,
      title:       newAppt.title,
      description: encodeDescription(newAppt.description, newAppt.recurrence),
      date:        newAppt.date,
      time:        newAppt.time,
      end_time:    newAppt.endTime,
      location:    newAppt.location,
      color:       newAppt.color,
      created_at:  newAppt.createdAt,
    }).then(({ error }) => { if (error) console.error('Appt insert error:', error) })
  }, [user.id])

  const updateAppointment = useCallback((id, updates) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a))
    const dbUpdates = {}
    if ('title'       in updates) dbUpdates.title    = updates.title
    if ('date'        in updates) dbUpdates.date     = updates.date
    if ('time'        in updates) dbUpdates.time     = updates.time
    if ('endTime'     in updates) dbUpdates.end_time = updates.endTime
    if ('location'    in updates) dbUpdates.location = updates.location
    if ('color'       in updates) dbUpdates.color    = updates.color
    // Re-encode description whenever description or recurrence changes
    if ('description' in updates || 'recurrence' in updates) {
      // Get current appt for the non-updated field
      const existing = updates
      const desc      = 'description' in updates ? updates.description : undefined
      const recur     = 'recurrence'  in updates ? updates.recurrence  : undefined
      // We'll encode both if either changed; caller should pass both if updating together
      if (desc !== undefined || recur !== undefined) {
        dbUpdates.description = encodeDescription(desc ?? '', recur ?? null)
      }
    }
    supabase.from('appointments').update(dbUpdates).eq('id', id)
      .then(({ error }) => { if (error) console.error('Appt update error:', error) })
  }, [])

  const deleteAppointment = useCallback((id) => {
    setAppointments(prev => prev.filter(a => a.id !== id))
    supabase.from('appointments').delete().eq('id', id)
      .then(({ error }) => { if (error) console.error('Appt delete error:', error) })
  }, [])

  const getAppointmentsByDate = useCallback((dateStr) => {
    const results = []
    for (const a of appointments) {
      if (!a.recurrence) {
        if (a.date === dateStr) results.push(a)
      } else {
        if (doesRecurOn(a, dateStr)) results.push({ ...a, date: dateStr })
      }
    }
    return results.sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  }, [appointments])

  return (
    <AppointmentContext.Provider value={{
      appointments,
      addAppointment,
      updateAppointment,
      deleteAppointment,
      getAppointmentsByDate,
    }}>
      {children}
    </AppointmentContext.Provider>
  )
}

export function useAppointments() {
  const ctx = useContext(AppointmentContext)
  if (!ctx) throw new Error('useAppointments must be used within AppointmentProvider')
  return ctx
}
