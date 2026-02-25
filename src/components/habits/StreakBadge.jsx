import '@styles/pages/habits.css'

function getTier(streak) {
  if (streak >= 100) return 'legendary'
  if (streak >= 30)  return 'hot'
  if (streak >= 7)   return 'warm'
  return 'cold'
}

export default function StreakBadge({ streak, mastered }) {
  if (mastered) {
    return (
      <span className="streak-badge streak-badge--mastered" title="Habit mastered — 90+ day streak achieved">
        <span className="streak-flame">♛</span>
        {streak > 0 ? `${streak}d` : 'Mastered'}
      </span>
    )
  }
  const tier = getTier(streak)
  return (
    <span className={`streak-badge streak-badge--${tier}`}>
      <span className="streak-flame">
        {tier === 'legendary' ? '⭐' : tier === 'hot' ? '🔥' : tier === 'warm' ? '🔥' : '▪'}
      </span>
      {streak}d
    </span>
  )
}
