import { useXP } from '@context/XPContext'
import GlowCard from '@components/ui/GlowCard'
import ProgressBar from '@components/ui/ProgressBar'
import '@styles/pages/profile.css'

export default function CategoryCard({ category, index }) {
  const { getCategoryData } = useXP()
  const data = getCategoryData(category.id)

  return (
    <GlowCard
      className="category-card"
      interactive
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <div className="category-card__header">
        <div
          className="category-card__icon"
          style={{
            background: `color-mix(in srgb, ${category.color} 14%, transparent)`,
            borderColor: `color-mix(in srgb, ${category.color} 35%, transparent)`,
          }}
        >
          {category.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div className="category-card__name" style={{ color: category.color }}>
            {category.name}
          </div>
        </div>
        <div className="category-card__level" style={{ color: category.color }}>
          {data.level}
        </div>
      </div>

      <div className="category-card__xp">
        <span>Level {data.level}</span>
        <span>{data.totalXP.toLocaleString()} XP · {data.xpToNext} to next</span>
      </div>

      <ProgressBar
        value={data.progress}
        color={category.color}
        animated
      />
    </GlowCard>
  )
}
