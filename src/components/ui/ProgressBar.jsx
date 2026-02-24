import '@styles/components/progress-bar.css'

export default function ProgressBar({
  value = 0,           // 0-100
  color,               // CSS color value
  animated = true,
  size = 'md',         // 'md' | 'lg'
  label,
  valueLabel,
}) {
  return (
    <div className="progress-bar">
      {(label || valueLabel) && (
        <div className="progress-bar__header">
          {label     && <span className="progress-bar__label">{label}</span>}
          {valueLabel && <span className="progress-bar__value">{valueLabel}</span>}
        </div>
      )}
      <div className={`progress-bar__track${size === 'lg' ? ' progress-bar__track--lg' : ''}`}>
        <div
          className={`progress-bar__fill${animated ? ' progress-bar__fill--animated' : ''}`}
          style={{
            width: `${Math.min(100, Math.max(0, value))}%`,
            '--bar-color': color,
          }}
        />
      </div>
    </div>
  )
}
