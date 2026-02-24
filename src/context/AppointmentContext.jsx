import { createContext, useContext, useCallback } from 'react'
import { useLocalStorage } from '@hooks/useLocalStorage'
import { STORAGE_KEYS } from '@utils/storageKeys'

const AppointmentContext = createContext(null)

export function AppointmentProvider({ children }) {
  const [appointments, setAppointments] = useLocalStorage(STORAGE_KEYS.APPOINTMENTS, [])

  const addAppointment = useCallback((data) => {
    const newAppt = {
      id:          `appt_${Date.now()}`,
      title:       data.title.trim(),
      description: data.description?.trim() ?? '',
      date:        data.date,
      time:        data.time || '',
      endTime:     data.endTime || '',
      location:    data.location?.trim() ?? '',
      color:       data.color || '#00d4ff',
      createdAt:   new Date().toISOString(),
    }
    setAppointments(prev => [...prev, newAppt])
  }, [setAppointments])

  const updateAppointment = useCallback((id, updates) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a))
  }, [setAppointments])

  const deleteAppointment = useCallback((id) => {
    setAppointments(prev => prev.filter(a => a.id !== id))
  }, [setAppointments])

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
