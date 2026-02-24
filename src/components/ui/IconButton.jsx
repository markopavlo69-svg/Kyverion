import '@styles/components/icon-button.css'

export default function IconButton({
  children,
  onClick,
  title,
  variant = 'default',  // 'default' | 'danger' | 'complete' | 'edit'
  size = 'md',          // 'sm' | 'md' | 'lg'
  active = false,
  disabled = false,
  type = 'button',
}) {
  const classes = [
    'icon-btn',
    size !== 'md'  ? `icon-btn--${size}` : '',
    variant !== 'default' ? `icon-btn--${variant}` : '',
    active ? 'icon-btn--active' : '',
  ].filter(Boolean).join(' ')

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
