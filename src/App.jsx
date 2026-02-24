import { useState } from 'react'
import { useAuth } from '@context/AuthContext'
import { AppProvider } from '@context/AppContext'
import LoginPage from '@pages/LoginPage'
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

// Inner app — only mounts when user is authenticated and all providers are ready
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
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        color: 'var(--text-muted)',
        fontSize: '1.2rem',
        letterSpacing: '0.1em',
      }}>
        Loading…
      </div>
    )
  }

  if (!user) return <LoginPage />

  // Data providers only mount once user is authenticated
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  )
}
