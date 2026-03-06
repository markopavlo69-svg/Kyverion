import { useState, useEffect } from 'react'
import { useNoSmoke } from '@context/NoSmokeContext'
import Modal from '@components/ui/Modal'
import Button from '@components/ui/Button'
import '@styles/pages/nosmoke.css'

// ── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(ts) {
  return new Date(ts).toLocaleDateString('en-CA')
}

function todayStr() {
  return new Date().toLocaleDateString('en-CA')
}

function formatDuration(totalSeconds) {
  const d   = Math.floor(totalSeconds / 86_400)
  const h   = Math.floor((totalSeconds % 86_400) / 3_600)
  const m   = Math.floor((totalSeconds % 3_600) / 60)
  const s   = totalSeconds % 60
  const pad = v => String(v).padStart(2, '0')
  if (d > 0) return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NoSmokePage() {
  const {
    settings, log, record, startTime, loaded,
    NS_MILESTONES, NS_QUIT_THRESHOLD, NS_QUIT_XP,
    ensureStarted, saveSettings, logSmoke,
    getCurrentStreak, checkMilestones,
    quitForGoodClaimed, claimQuitForGood, resetTimer,
  } = useNoSmoke()

  const [now, setNow]                           = useState(Date.now())
  const [showSettings, setShowSettings]         = useState(false)
  const [showConfirm, setShowConfirm]           = useState(false)
  const [showQuitConfirm, setShowQuitConfirm]   = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [dailyCigarettes, setDailyCigarettes]   = useState('')
  const [packPrice, setPackPrice]               = useState('')

  // Start tracking on first page visit — only after DB data has loaded
  useEffect(() => { if (loaded) ensureStarted() }, [loaded, ensureStarted])

  // Tick every second → drives the live timer
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000)
    return () => clearInterval(id)
  }, [])

  // Check XP milestones every second
  const streak = getCurrentStreak(now)
  useEffect(() => {
    if (startTime) checkMilestones(streak)
  }, [streak, startTime, checkMilestones])

  // ── Derived values ──────────────────────────────────────────────────────────

  const daily      = settings.dailyCigarettes || 0
  const today      = todayStr()
  const todayCount = log.filter(ts => toDateStr(ts) === today).length
  const remaining  = daily > 0 ? Math.max(0, daily - todayCount) : null
  const limitPct   = daily > 0 ? Math.min(100, Math.round((todayCount / daily) * 100)) : 0

  const moneySaved = (() => {
    if (!settings.dailyCigarettes || !settings.packPrice || !startTime) return null
    const pricePerCig = settings.packPrice / 20
    const daysElapsed = (now - startTime) / 86_400_000
    const expected    = daysElapsed * settings.dailyCigarettes
    return Math.max(0, expected - log.length) * pricePerCig
  })()

  const nextMilestone = NS_MILESTONES.find(m => streak < m.seconds)
  const milestonePct  = nextMilestone
    ? Math.min(100, Math.round((streak / nextMilestone.seconds) * 100))
    : 100

  const weekDays = (() => {
    const days    = []
    const nowDate = new Date(now)
    for (let i = 6; i >= 0; i--) {
      const d    = new Date(nowDate)
      d.setDate(nowDate.getDate() - i)
      const dStr = d.toLocaleDateString('en-CA')
      const cnt  = log.filter(ts => toDateStr(ts) === dStr).length
      const name = d.toLocaleDateString('en-US', { weekday: 'short' })
      const pct  = daily > 0 ? Math.min(100, Math.round((cnt / daily) * 100)) : 0
      days.push({ name, cnt, isToday: dStr === today, pct })
    }
    return days
  })()

  // ── Handlers ────────────────────────────────────────────────────────────────

  const openSettings = () => {
    setDailyCigarettes(settings.dailyCigarettes ?? '')
    setPackPrice(settings.packPrice ?? '')
    setShowSettings(true)
  }

  const handleSaveSettings = () => {
    saveSettings({
      dailyCigarettes: parseInt(dailyCigarettes)  || 0,
      packPrice:       parseFloat(packPrice)       || 0,
    })
    setShowSettings(false)
  }

  const handleConfirmSmoked = () => {
    logSmoke()
    setShowConfirm(false)
  }

  const handleConfirmReset = () => {
    resetTimer()
    setShowResetConfirm(false)
    setShowSettings(false)
  }

  const handleClaimQuit = () => {
    claimQuitForGood()
    setShowQuitConfirm(false)
  }

  const canClaimQuit = streak >= NS_QUIT_THRESHOLD && !quitForGoodClaimed

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="ns-page">

      {/* ── Header ── */}
      <div className="page-header">
        <h1 className="page-title">No Smoke</h1>
        <Button variant="ghost" onClick={openSettings}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: 4 }}>
            <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.8 2.8l1 1M10.2 10.2l1 1M11.2 2.8l-1 1M3.8 10.2l-1 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Settings
        </Button>
      </div>

      {/* ── Hero Timer ── */}
      <div className="ns-hero">
        <p className="ns-hero__label">Smoke-Free For</p>
        <div className="ns-hero__timer">{formatDuration(streak)}</div>

        <div className="ns-hero__record">
          <span>🏆 Record:</span>
          <span className="ns-hero__record-val">{formatDuration(record)}</span>
        </div>

        {/* Next milestone progress */}
        {nextMilestone ? (
          <div className="ns-milestone">
            <div className="ns-milestone__header">
              <span className="ns-milestone__label">{nextMilestone.label}</span>
              <span className="ns-milestone__xp">+{nextMilestone.xp} XP 💚</span>
            </div>
            <div className="ns-milestone__track">
              <div className="ns-milestone__fill" style={{ width: `${milestonePct}%` }} />
            </div>
            <span className="ns-milestone__pct">{milestonePct}%</span>
          </div>
        ) : (
          <div className="ns-milestone ns-milestone--complete">
            🎉 All milestones unlocked!
          </div>
        )}
      </div>

      {/* ── Stats Row ── */}
      <div className="ns-stats-row">
        <div className="stat-card">
          <div className="stat-card__value" style={{ color: 'var(--priority-high)' }}>
            {todayCount}
          </div>
          <div className="stat-card__label">Smoked Today</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__value stat-card__value--gold">
            {moneySaved !== null ? `€${moneySaved.toFixed(2)}` : '—'}
          </div>
          <div className="stat-card__label">Money Saved</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__value" style={{ color: 'var(--cat-vitality)' }}>
            {remaining !== null ? remaining : '—'}
          </div>
          <div className="stat-card__label">Remaining</div>
        </div>
      </div>

      {/* ── Daily Limit Progress ── */}
      {daily > 0 && (
        <div className="ns-limit-card">
          <div className="ns-limit-card__header">
            <span>Daily Limit</span>
            <span>{todayCount} / {daily} cigarettes</span>
          </div>
          <div className="ns-limit-track">
            <div className="ns-limit-fill" style={{ width: `${limitPct}%` }} />
          </div>
        </div>
      )}

      {/* ── Weekly Chart ── */}
      <div className="ns-weekly-card">
        <p className="ns-card-title">This Week</p>
        <div className="ns-weekly-grid">
          {weekDays.map(({ name, cnt, isToday, pct }) => (
            <div key={name} className={`ns-day${isToday ? ' ns-day--today' : ''}`}>
              <span className="ns-day__name">{name}</span>
              <span className="ns-day__count">{cnt}</span>
              <div className="ns-day__track">
                <div
                  className="ns-day__fill"
                  style={{ height: `${cnt > 0 ? Math.max(pct, 8) : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quit For Good Achievement ── */}
      {quitForGoodClaimed ? (
        <div className="ns-quit-banner">
          <span className="ns-quit-banner__icon">🚭</span>
          <div className="ns-quit-banner__text">
            <strong>Smoke-Free For Life</strong>
            <span>You claimed your freedom. This is permanent.</span>
          </div>
          <span className="ns-quit-banner__xp">+{NS_QUIT_XP} XP</span>
        </div>
      ) : canClaimQuit ? (
        <button className="ns-quit-btn" onClick={() => setShowQuitConfirm(true)}>
          <span className="ns-quit-btn__icon">🚭</span>
          <span className="ns-quit-btn__label">I Quit For Good</span>
          <span className="ns-quit-btn__xp">+{NS_QUIT_XP} XP</span>
        </button>
      ) : null}

      {/* ── I Smoked Button ── */}
      <button className="ns-smoked-btn" onClick={() => setShowConfirm(true)}>
        💨 I Smoked
      </button>

      {/* ── Quit For Good Confirm Modal ── */}
      <Modal
        isOpen={showQuitConfirm}
        title="🚭 Quit For Good"
        onClose={() => setShowQuitConfirm(false)}
        footer={
          <div className="ns-modal-footer">
            <Button variant="ghost" onClick={() => setShowQuitConfirm(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleClaimQuit}>Claim +{NS_QUIT_XP} XP</Button>
          </div>
        }
      >
        <p className="ns-confirm-text">
          You&apos;ve been smoke-free for{' '}
          <strong style={{ color: 'var(--cat-vitality)' }}>{formatDuration(streak)}</strong>.
          {' '}Claiming this means you&apos;re done for good — a permanent achievement worth{' '}
          <strong style={{ color: 'var(--accent-gold)' }}>{NS_QUIT_XP} XP</strong>.
          <br /><br />
          Even if you relapse later, this badge stays. It marks the day you decided to stop.
        </p>
      </Modal>

      {/* ── Confirm Modal ── */}
      <Modal
        isOpen={showConfirm}
        title="Log a Cigarette?"
        onClose={() => setShowConfirm(false)}
        footer={
          <div className="ns-modal-footer">
            <Button variant="ghost" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleConfirmSmoked}>Yes, I Smoked</Button>
          </div>
        }
      >
        <p className="ns-confirm-text">
          This will reset your smoke-free timer. Your current streak of{' '}
          <strong style={{ color: 'var(--cat-vitality)' }}>{formatDuration(streak)}</strong>
          {' '}will be saved as your record if it&apos;s your best.
        </p>
      </Modal>

      {/* ── Settings Modal ── */}
      <Modal
        isOpen={showSettings}
        title="No Smoke Settings"
        onClose={() => setShowSettings(false)}
        footer={
          <div className="ns-modal-footer">
            <Button variant="ghost" onClick={() => setShowSettings(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveSettings}>Save</Button>
          </div>
        }
      >
        <div className="ns-settings-body">
          <div className="form-group">
            <label className="form-label">Daily Cigarettes Goal</label>
            <input
              type="number"
              min="0"
              value={dailyCigarettes}
              onChange={e => setDailyCigarettes(e.target.value)}
              placeholder="e.g. 10"
            />
            <p className="form-hint">Your current daily average — used to track reduction and money saved.</p>
          </div>
          <div className="form-group">
            <label className="form-label">Pack Price (€)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={packPrice}
              onChange={e => setPackPrice(e.target.value)}
              placeholder="e.g. 6.50"
            />
            <p className="form-hint">Price per pack of 20 cigarettes.</p>
          </div>
          <div className="form-group" style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
            <label className="form-label" style={{ color: 'var(--priority-high)' }}>Danger Zone</label>
            <Button variant="danger" onClick={() => setShowResetConfirm(true)} style={{ width: '100%' }}>
              Reset Timer
            </Button>
            <p className="form-hint">Clears your log and restarts the streak from now on this device. Your personal record is kept.</p>
          </div>
        </div>
      </Modal>

      {/* ── Reset Confirm Modal ── */}
      <Modal
        isOpen={showResetConfirm}
        title="Reset Timer?"
        onClose={() => setShowResetConfirm(false)}
        footer={
          <div className="ns-modal-footer">
            <Button variant="ghost" onClick={() => setShowResetConfirm(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleConfirmReset}>Yes, Reset</Button>
          </div>
        }
      >
        <p className="ns-confirm-text">
          This will restart your smoke-free timer from <strong>right now</strong> on this device and clear your smoke log.
          Your personal record of <strong style={{ color: 'var(--accent-gold)' }}>{formatDuration(record)}</strong> will be preserved.
        </p>
      </Modal>

    </div>
  )
}
