import '@styles/pages/habits.css'

function getTier(streak) {
  if (streak >= 100) return 'legendary'
  if (streak >= 30)  return 'hot'
  if (streak >= 7)   return 'warm'
  return 'cold'
}

export default function StreakBadge({ streak }) {
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
