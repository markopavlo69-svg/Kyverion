export default function MessageBubble({ message, character }) {
  const isUser = message.role === 'user'

  return (
    <div className={`msg-wrap ${isUser ? 'msg-user' : 'msg-ai'} ${message.isProactive ? 'msg-proactive' : ''}`}>
      {/* AI avatar */}
      {!isUser && (
        <div className="msg-avatar" style={{ background: character?.accentColor + '22', borderColor: character?.accentColor + '55' }}>
          {character?.avatarSrc
            ? <img src={character.avatarSrc} alt={character.name} />
            : <span style={{ color: character?.accentColor }}>{character?.name?.[0] ?? '?'}</span>
          }
        </div>
      )}

      <div className="msg-body">
        {/* Character name above AI messages */}
        {!isUser && (
          <div className="msg-char-name" style={{ color: character?.accentColor }}>
            {message.isProactive && <span className="msg-proactive-icon">📬 </span>}
            {character?.name}
          </div>
        )}

        {/* Image attachment (user side) */}
        {message.hadImage && message.imageDataUrl && (
          <img
            src={message.imageDataUrl}
            className="msg-image"
            alt="attachment"
          />
        )}

        {/* Bubble */}
        <div
          className={`msg-bubble ${isUser ? 'msg-bubble-user' : 'msg-bubble-ai'}`}
          style={!isUser ? { borderLeftColor: character?.accentColor } : undefined}
        >
          {message.content || (message.isStreaming ? '' : '…')}
          {message.isStreaming && <span className="streaming-cursor" aria-hidden>▋</span>}
        </div>

        {/* Action results */}
        {message.actions?.length > 0 && (
          <div className="msg-actions">
            {message.actions.map((a, i) => (
              <span key={i} className={`msg-action-note ${a.success ? 'action-ok' : 'action-fail'}`}>
                {a.success ? '✓' : '✗'} {a.description}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
