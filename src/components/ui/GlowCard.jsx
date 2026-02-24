import '@styles/components/glow-card.css'

export default function GlowCard({ children, variant = 'default', interactive = false, className = '', style }) {
  const classes = [
    'glow-card',
    variant !== 'default' ? `glow-card--${variant}` : '',
    interactive ? 'glow-card--interactive' : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <div className={classes} style={style}>
      {children}
    </div>
  )
}
