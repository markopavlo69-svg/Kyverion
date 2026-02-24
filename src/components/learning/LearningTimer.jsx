import { useLearning } from '@context/LearningContext'

function pad(n) { return String(n).padStart(2, '0') }

function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}

export default function LearningTimer({ areaId }) {
  const { activeSession, startSession, stopSession } = useLearning()

  const isThisArea = activeSession?.areaId === areaId
  const isOtherArea = activeSession && !isThisArea
  const elapsed = isThisArea ? activeSession.elapsed : 0

  return (
    <div className="learning-timer">
      {isThisArea ? (
        <>
          <div className="timer-display">
            <span className="timer-pulse" />
            <span className="timer-time">{formatElapsed(elapsed)}</span>
          </div>
          <p className="timer-hint">
            Session in progress — {Math.floor(elapsed / 60)} min × 2 XP/min
          </p>
          <button className="btn btn--danger btn--lg" onClick={stopSession}>
            ⏹ Stop Learning
          </button>
        </>
      ) : (
        <>
          <button
            className="btn btn--start btn--lg"
            onClick={() => startSession(areaId)}
            disabled={isOtherArea}
            title={isOtherArea ? 'Another area session is active' : ''}
          >
            ▶ Start Learning
          </button>
          {isOtherArea && (
            <p className="timer-hint timer-hint--warn">
              Stop the active session first.
            </p>
          )}
        </>
      )}
    </div>
  )
}
