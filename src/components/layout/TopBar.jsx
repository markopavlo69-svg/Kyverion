import '@styles/layout.css'

export default function TopBar({ title, onMenuClick }) {
  return (
    <header className="topbar">
      <button className="topbar__menu-btn" onClick={onMenuClick} aria-label="Open menu">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
      <span className="topbar__title">{title}</span>
      <div style={{ width: 38 }} />
    </header>
  )
}
