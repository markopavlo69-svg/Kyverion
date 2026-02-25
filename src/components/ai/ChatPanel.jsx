import { useEffect, useRef } from 'react'
import { useAI }            from '@context/AIContext'
import CharacterSelector    from './CharacterSelector'
import MessageBubble        from './MessageBubble'
import ChatInput            from './ChatInput'

export default function ChatPanel() {
  const { activeCharacter, currentHistory, isStreaming, sendMessage, toggleChat } = useAI()
  const bottomRef = useRef(null)

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentHistory])

  return (
    <div
      className="ai-chat-panel"
      style={{ '--char-color': activeCharacter?.accentColor ?? 'var(--accent-teal)' }}
    >
      {/* Header */}
      <div className="ai-panel-header">
        <CharacterSelector />
        <button className="ai-panel-close" onClick={toggleChat} title="Close" type="button">
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="ai-messages">
        {currentHistory.length === 0 && (
          <div className="ai-empty-state">
            <div className="ai-empty-avatar">
              {activeCharacter?.avatarSrc
                ? <img src={activeCharacter.avatarSrc} alt={activeCharacter.name} />
                : <span style={{ color: activeCharacter?.accentColor }}>
                    {activeCharacter?.name?.[0] ?? '?'}
                  </span>
              }
            </div>
            <p>Start a conversation with <strong style={{ color: activeCharacter?.accentColor }}>
              {activeCharacter?.name}
            </strong>!</p>
            <p className="ai-empty-hint">
              You can ask for help, report completed habits, add tasks, or just chat.
            </p>
          </div>
        )}

        {currentHistory.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            character={activeCharacter}
          />
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={isStreaming} />
    </div>
  )
}
