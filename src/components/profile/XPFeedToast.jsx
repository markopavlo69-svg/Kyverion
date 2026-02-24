import { useEffect, useRef } from 'react'
import '@styles/pages/profile.css'

function Toast({ toast, onDismiss }) {
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(toast.id), 2500)
    return () => clearTimeout(timerRef.current)
  }, [toast.id, onDismiss])

  return (
    <div className="xp-toast">
      <div
        className="xp-toast__dot"
        style={{ background: toast.color, color: toast.color }}
      />
      <div>
        <div className="xp-toast__text">+{toast.xp} XP</div>
        <div className="xp-toast__category">{toast.category}</div>
      </div>
    </div>
  )
}

export default function XPFeedToast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null

  return (
    <div className="xp-toast-container">
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
