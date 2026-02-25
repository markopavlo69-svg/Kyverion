import { useEffect }  from 'react'
import { useAI }      from '@context/AIContext'
import ChatPanel      from './ChatPanel'
import '@styles/pages/ai-chat.css'

/**
 * Always-rendered floating chat widget.
 * Receives activePage + onNavigate from App.jsx to keep AIContext in sync.
 */
export default function AIChat({ activePage, onNavigate }) {
  const {
    activeCharacter,
    unreadCount,
    isOpen,
    toggleChat,
    registerNavigate,
    registerActivePage,
  } = useAI()

  // Keep AIContext refs in sync
  useEffect(() => { registerNavigate(onNavigate)   }, [onNavigate,   registerNavigate])
  useEffect(() => { registerActivePage(activePage) }, [activePage,   registerActivePage])

  return (
    <div className="ai-chat-root">
      {/* Chat panel (conditionally shown) */}
      {isOpen && <ChatPanel />}

      {/* Floating toggle button */}
      <button
        className={`ai-toggle-btn ${isOpen ? 'open' : ''}`}
        style={{ '--char-color': activeCharacter?.accentColor ?? 'var(--accent-teal)' }}
        onClick={toggleChat}
        title={isOpen ? 'Close chat' : `Chat with ${activeCharacter?.name ?? 'AI'}`}
        type="button"
        aria-label="Toggle AI chat"
      >
        {activeCharacter?.avatarSrc
          ? (
            <img
              src={activeCharacter.avatarSrc}
              alt={activeCharacter?.name}
              className="ai-toggle-avatar"
            />
          )
          : (
            <span className="ai-toggle-initials">
              {activeCharacter?.name?.[0] ?? '✦'}
            </span>
          )
        }

        {unreadCount > 0 && (
          <span className="ai-unread-badge" aria-label={`${unreadCount} unread messages`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  )
}
