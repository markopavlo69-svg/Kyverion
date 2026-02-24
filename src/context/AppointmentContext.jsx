import { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { supabase } from '@lib/supabase'
import { useAuth } from './AuthContext'

const AppointmentContext = createContext(null)

function dbToAppt(row) {
  return {
    id:          row.id,
    title:       row.title,
    description: row.description ?? '',
    date:        row.date,
    time:        row.time        ?? '',
    endTime:     row.end_time    ?? '',
    location:    row.location    ?? '',
    color:       row.color       ?? '#00d4ff',
    createdAt:   row.created_at,
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
      createdAt:   new Date().toISOString(),
    }
    setAppointments(prev => [...prev, newAppt])
    supabase.from('appointments').insert({
      id:          newAppt.id,
      user_id:     user.id,
      title:       newAppt.title,
      description: newAppt.description,
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
    if ('title'       in updates) dbUpdates.title       = updates.title
    if ('description' in updates) dbUpdates.description = updates.description
    if ('date'        in updates) dbUpdates.date        = updates.date
    if ('time'        in updates) dbUpdates.time        = updates.time
    if ('endTime'     in updates) dbUpdates.end_time    = updates.endTime
    if ('location'    in updates) dbUpdates.location    = updates.location
    if ('color'       in updates) dbUpdates.color       = updates.color
    supabase.from('appointments').update(dbUpdates).eq('id', id)
      .then(({ error }) => { if (error) console.error('Appt update error:', error) })
  }, [])

  const deleteAppointment = useCallback((id) => {
    setAppointments(prev => prev.filter(a => a.id !== id))
    supabase.from('appointments').delete().eq('id', id)
      .then(({ error }) => { if (error) console.error('Appt delete error:', error) })
  }, [])

  const getAppointmentsByDate = useCallback((dateStr) => {
    return appointments
      .filter(a => a.date === dateStr)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
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
