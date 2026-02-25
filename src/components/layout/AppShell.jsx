import { useState } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import '@styles/layout.css'

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  tasks:     'Tasks',
  habits:    'Habits',
  calendar:  'Calendar',
  profile:   'Profile',
  nosmoke:   'No Smoke',
  finance:   'Finance',
  learning:  'Learning',
}

export default function AppShell({ activePage, onNavigate, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleNavigate = (page) => {
    onNavigate(page)
    setSidebarOpen(false)
  }

  return (
    <div className="app-shell">
      <TopBar
        title={PAGE_TITLES[activePage] ?? 'Kyverion'}
        onMenuClick={() => setSidebarOpen(true)}
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
    </div>
  )
}
