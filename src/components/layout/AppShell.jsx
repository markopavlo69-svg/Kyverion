import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import AppSearch from './AppSearch'
import '@styles/layout.css'

const PAGE_TITLES = {
  today:     'Today',
  dashboard: 'Dashboard',
  tasks:     'Tasks',
  habits:    'Habits',
  calendar:  'Calendar',
  profile:   'Profile',
  nosmoke:   'No Smoke',
  finance:   'Finance',
  learning:  'Learning',
  workout:   'Workout',
}

export default function AppShell({ activePage, onNavigate, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen,  setSearchOpen]  = useState(false)

  // Ctrl+K / Cmd+K global shortcut
  useEffect(() => {
    const handler = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(v => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleNavigate = (page) => {
    onNavigate(page)
    setSidebarOpen(false)
  }

  return (
    <div className="app-shell">
      <TopBar
        title={PAGE_TITLES[activePage] ?? 'Kyverion'}
        onMenuClick={() => setSidebarOpen(true)}
        onSearchClick={() => setSearchOpen(true)}
      />

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
      />

      <main className="app-main">
        <div className="page-wrapper">
          {children}
        </div>
      </main>

      {searchOpen && (
        <AppSearch
          onNavigate={handleNavigate}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </div>
  )
}
