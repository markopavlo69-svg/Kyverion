import { useState } from 'react'
import AppShell from '@components/layout/AppShell'
import TasksPage from '@pages/TasksPage'
import HabitsPage from '@pages/HabitsPage'
import CalendarPage from '@pages/CalendarPage'
import ProfilePage from '@pages/ProfilePage'
import NoSmokePage from '@pages/NoSmokePage'
import FinancePage from '@pages/FinancePage'
import LearningPage from '@pages/LearningPage'
import XPFeedToast from '@components/profile/XPFeedToast'
import { useXP } from '@context/XPContext'

function AppInner() {
  const [activePage, setActivePage] = useState('tasks')
  const { toastQueue, dismissToast } = useXP()

  const renderPage = () => {
    switch (activePage) {
      case 'tasks':    return <TasksPage />
      case 'habits':   return <HabitsPage />
      case 'calendar': return <CalendarPage />
      case 'profile':  return <ProfilePage />
      case 'nosmoke':  return <NoSmokePage />
      case 'finance':  return <FinancePage />
      case 'learning': return <LearningPage />
      default:         return <TasksPage />
    }
  }

  return (
    <>
      <AppShell activePage={activePage} onNavigate={setActivePage}>
        {renderPage()}
      </AppShell>
      <XPFeedToast toasts={toastQueue} onDismiss={dismissToast} />
    </>
  )
}

export default function App() {
  return <AppInner />
}
