import { useXP } from '@context/XPContext'
import { getLevelTitle } from '@utils/xpCalculator'
import '@styles/layout.css'

const NAV_ITEMS = [
  {
    id: 'tasks',
    label: 'Tasks',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="2" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M6 9l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'habits',
    label: 'Habits',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 2C6 2 4 5 5 8c.5 1.5 2 2.5 2 4.5 0 .8.7 1.5 1.5 1.5S10 13.3 10 12.5c0-2 1.5-3 2-4.5 1-3-1-6-3-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M6.5 14.5C7 16 8 16.5 9 16.5s2-.5 2.5-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="3.5" width="14" height="12.5" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M2 7.5h14M6 2v3M12 2v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="6" cy="11" r="1" fill="currentColor"/>
        <circle cx="9" cy="11" r="1" fill="currentColor"/>
        <circle cx="12" cy="11" r="1" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M2 16c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'nosmoke',
    label: 'No Smoke',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M4.5 9.5h5M13 9.5h.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
        <path d="M4.5 4.5l9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="4" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M2 7.5h14" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="5.5" cy="11" r="1" fill="currentColor"/>
        <path d="M8.5 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'learning',
    label: 'Learning',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 3L2 7l7 4 7-4-7-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M2 11l7 4 7-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16 7v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
]

export default function Sidebar({ activePage, onNavigate, isOpen }) {
  const { xpData } = useXP()
  const { globalLevel, globalTotalXP } = xpData

  return (
    <aside className={`sidebar${isOpen ? ' sidebar--open' : ''}`}>
      <div className="sidebar__logo">
        <div className="sidebar__logo-icon">K</div>
        <span className="sidebar__logo-text">KYVERION</span>
      </div>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`nav-item${activePage === item.id ? ' nav-item--active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="nav-item__icon">{item.icon}</span>
            <span className="nav-item__label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar__footer">
        <button
          className="sidebar__level-widget"
          style={{ width: '100%', cursor: 'pointer', textAlign: 'left' }}
          onClick={() => onNavigate('profile')}
        >
          <div className="sidebar__level-orb">{globalLevel}</div>
          <div className="sidebar__level-info">
            <div className="sidebar__level-label">{getLevelTitle(globalLevel)}</div>
            <div className="sidebar__level-xp">{globalTotalXP.toLocaleString()} total XP</div>
          </div>
        </button>
      </div>
    </aside>
  )
}
