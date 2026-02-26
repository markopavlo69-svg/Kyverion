import { Component } from 'react'

/**
 * Top-level error boundary — catches unhandled React render errors
 * so the entire app doesn't go white. Renders a minimal fallback UI
 * that lets the user reload without losing their URL / session.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Uncaught render error:', error, info)
  }

  handleReload() {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.2rem',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        padding: '2rem',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '2.5rem' }}>⚠️</div>
        <h2 style={{ margin: 0, color: 'var(--accent-primary)' }}>Something went wrong</h2>
        <p style={{ margin: 0, color: 'var(--text-muted)', maxWidth: '420px', lineHeight: 1.6 }}>
          An unexpected error occurred. Your data is safe — this is a display issue only.
        </p>
        {this.state.error && (
          <pre style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            background: 'var(--bg-secondary)',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            maxWidth: '560px',
            overflow: 'auto',
            textAlign: 'left',
          }}>
            {this.state.error.message}
          </pre>
        )}
        <button
          onClick={this.handleReload}
          style={{
            marginTop: '0.5rem',
            padding: '0.6rem 1.8rem',
            borderRadius: '8px',
            border: '1px solid var(--accent-primary)',
            background: 'transparent',
            color: 'var(--accent-primary)',
            fontSize: '0.9rem',
            cursor: 'pointer',
            letterSpacing: '0.05em',
          }}
        >
          Reload app
        </button>
      </div>
    )
  }
}
