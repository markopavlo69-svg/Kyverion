import CalendarView from '@components/calendar/CalendarView'
import '@styles/pages/calendar.css'

export default function CalendarPage() {
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Calendar</h1>
      </div>
      <CalendarView />
    </>
  )
}
