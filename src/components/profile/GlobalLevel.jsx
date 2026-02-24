import { useXP } from '@context/XPContext'
import { getLevelTitle, xpToNextLevel, progressPercent } from '@utils/xpCalculator'
import GlowCard from '@components/ui/GlowCard'
import ProgressBar from '@components/ui/ProgressBar'
import '@styles/pages/profile.css'

const RADIUS = 78
const CIRCUM = 2 * Math.PI * RADIUS

export default function GlobalLevel() {
  const { xpData } = useXP()
  const { globalLevel, globalTotalXP } = xpData
  const progress = progressPercent(globalTotalXP)
  const toNext   = xpToNextLevel(globalTotalXP)
  const dashOffset = CIRCUM * (1 - progress / 100)

  return (
    <GlowCard className="global-level" variant="highlight">
      {/* SVG Ring */}
      <div className="global-level__ring-wrap">
        <svg width="180" height="180" viewBox="0 0 180 180">
          <defs>
            <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#00d4ff"/>
              <stop offset="50%"  stopColor="#a855f7"/>
              <stop offset="100%" stopColor="#f59e0b"/>
            </linearGradient>
          </defs>
          {/* Track */}
          <circle
            className="global-level__ring-bg"
            cx="90" cy="90"
            r={RADIUS}
            strokeWidth="12"
          />
          {/* Fill */}
          <circle
            className="global-level__ring-fill"
            cx="90" cy="90"
            r={RADIUS}
            strokeWidth="12"
            strokeDasharray={CIRCUM}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 90 90)"
          />
        </svg>

        {/* Center text */}
        <div className="global-level__center">
          <div className="global-level__number">{globalLevel}</div>
          <div className="global-level__label">LEVEL</div>
        </div>
      </div>

      <div className="global-level__title">{getLevelTitle(globalLevel)}</div>
      <div className="global-level__xp-text">
        <span>{globalTotalXP.toLocaleString()}</span> total XP · <span>{toNext.toLocaleString()}</span> to next
      </div>

      <ProgressBar
        value={progress}
        color="var(--accent-teal)"
        size="lg"
        animated
      />
    </GlowCard>
  )
}
