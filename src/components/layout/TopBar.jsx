import '@styles/layout.css'
import { useAuth } from '@context/AuthContext'

export default function TopBar({ title, onMenuClick, onSearchClick }) {
  const { signOut } = useAuth()

  return (
    <header className="topbar">
      <button className="topbar__menu-btn" onClick={onMenuClick} aria-label="Open menu">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
      <span className="topbar__title">{title}</span>

      <button
        className="topbar__search-btn"
        onClick={onSearchClick}
        aria-label="Search"
        title="Search (Ctrl+K)"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M12.5 12.5l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      </button>

      <button
        className="topbar__logout-btn"
        onClick={signOut}
        aria-label="Sign out"
        title="Sign out"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </header>
  )
}
