import { useState } from 'react'
import WorkoutOverview from '@components/workout/WorkoutOverview'
import CategoryView    from '@components/workout/CategoryView'
import '@styles/pages/workout.css'

const TABS = [
  { id: 'overview',      label: 'Overview',      icon: '📊' },
  { id: 'calisthenics',  label: 'Calisthenics',  icon: '🤸' },
  { id: 'gym',           label: 'Gym',            icon: '🏋️' },
  { id: 'other',         label: 'Other',          icon: '💪' },
]

export default function WorkoutPage() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="workout-page">
      <div className="workout-page__header">
        <h1 className="workout-page__title">Workout Tracker</h1>
        <p className="workout-page__subtitle">Track your training, set baselines, break records</p>
      </div>

      <nav className="workout-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`workout-tab${activeTab === tab.id ? ' workout-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="workout-tab__icon">{tab.icon}</span>
            <span className="workout-tab__label">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="workout-page__content">
        {activeTab === 'overview'     && <WorkoutOverview />}
        {activeTab === 'calisthenics' && <CategoryView category="calisthenics" />}
        {activeTab === 'gym'          && <CategoryView category="gym" />}
        {activeTab === 'other'        && <CategoryView category="other" />}
      </div>
    </div>
  )
}
