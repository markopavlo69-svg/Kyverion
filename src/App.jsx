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
import DashboardPage from '@pages/DashboardPage'
import TodayPage from '@pages/TodayPage'
import XPFeedToast from '@components/profile/XPFeedToast'
import { useXP } from '@context/XPContext'
import AIChat from '@components/ai/AIChat'
import { useNotifications } from '@hooks/useNotifications'

function NotificationManager() {
  useNotifications()
  return null
}

// Inner app — only mounts when user is authenticated and all providers are ready
function AppInner() {
  const [activePage, setActivePage] = useState('dashboard')
  const { toastQueue, dismissToast } = useXP()

  const renderPage = () => {
    switch (activePage) {
      case 'today':     return <TodayPage onNavigate={setActivePage} />
      case 'dashboard': return <DashboardPage onNavigate={setActivePage} />
      case 'tasks':     return <TasksPage />
      case 'habits':    return <HabitsPage />
      case 'calendar':  return <CalendarPage />
      case 'profile':   return <ProfilePage />
      case 'nosmoke':   return <NoSmokePage />
      case 'finance':   return <FinancePage />
      case 'learning':  return <LearningPage />
      default:          return <DashboardPage onNavigate={setActivePage} />
    }
  }

  return (
    <>
      <AppShell activePage={activePage} onNavigate={setActivePage}>
        {renderPage()}
      </AppShell>
      <XPFeedToast toasts={toastQueue} onDismiss={dismissToast} />
      <AIChat activePage={activePage} onNavigate={setActivePage} />
      <NotificationManager />
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
