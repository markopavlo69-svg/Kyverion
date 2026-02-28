import { useEffect, useRef, useState } from 'react'
import { useAI }            from '@context/AIContext'
import { AVAILABLE_MODELS } from '@services/groqService'
import CharacterSelector    from './CharacterSelector'
import MessageBubble        from './MessageBubble'
import ChatInput            from './ChatInput'

export default function ChatPanel() {
  const {
    activeCharacter,
    activeCharStats,
    currentHistory,
    isStreaming,
    preferredModel,
    sendMessage,
    toggleChat,
    deleteHistory,
    deleteMemory,
    resetAllStats,
    setPreferredModel,
    activeCharacterId,
  } = useAI()

  const bottomRef        = useRef(null)
  const settingsRef      = useRef(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentHistory])

  // Close settings dropdown when clicking outside
  useEffect(() => {
    if (!settingsOpen) return
    const handleClick = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [settingsOpen])

  // ── Relationship bar data ────────────────────────────────────────────────
  const dacs          = activeCharacter?.dacs
  const stats         = activeCharStats
  const relationMode  = stats?.relationship_mode ?? 'neutral'
  const modeLabel     = dacs?.relationshipLabels?.[relationMode] ?? relationMode
  const trustPct      = Math.round((stats?.trust_level ?? 0))
  const accentColor   = activeCharacter?.accentColor ?? 'var(--accent-teal)'

  // ── Settings handlers ────────────────────────────────────────────────────
  const handleDeleteHistory = () => {
    if (window.confirm(`Clear all chat history with ${activeCharacter?.name}? This cannot be undone.`)) {
      deleteHistory(activeCharacterId)
      setSettingsOpen(false)
    }
  }

  const handleDeleteMemory = () => {
    if (window.confirm(`Clear ${activeCharacter?.name}'s memory and reset their relationship stats? This cannot be undone.`)) {
      deleteMemory(activeCharacterId)
      setSettingsOpen(false)
    }
  }

  const handleResetAllStats = () => {
    if (window.confirm('Reset relationship stats for ALL characters to zero? Chat histories and memories are kept.')) {
      resetAllStats()
      setSettingsOpen(false)
    }
  }

  return (
    <div
      className="ai-chat-panel"
      style={{ '--char-color': accentColor }}
    >
      {/* Header */}
      <div className="ai-panel-header">
        <CharacterSelector />

        <div className="ai-panel-header-actions">
          {/* Settings button */}
          <div className="ai-settings-wrapper" ref={settingsRef}>
            <button
              className="ai-panel-icon-btn"
              onClick={() => setSettingsOpen(o => !o)}
              title="Settings"
              type="button"
              aria-label="Chat settings"
            >
              ⚙
            </button>

            {settingsOpen && (
              <div className="ai-settings-dropdown">
                {/* Per-character actions */}
                <div className="ai-settings-section">
                  <p className="ai-settings-label">{activeCharacter?.name}</p>
                  <button className="ai-settings-danger-btn" onClick={handleDeleteHistory} type="button">
                    🗑 Clear Chat History
                  </button>
                  <button className="ai-settings-danger-btn" onClick={handleDeleteMemory} type="button">
                    🧠 Clear Memory &amp; Reset Relationship
                  </button>
                </div>

                {/* Global reset */}
                <div className="ai-settings-section">
                  <p className="ai-settings-label">All Characters</p>
                  <button className="ai-settings-danger-btn" onClick={handleResetAllStats} type="button">
                    💔 Reset All Relationships
                  </button>
                </div>

                {/* Model selector */}
                <div className="ai-settings-section">
                  <p className="ai-settings-label">AI Model</p>
                  {AVAILABLE_MODELS.map(m => (
                    <label key={m.id} className="ai-settings-model-option">
                      <input
                        type="radio"
                        name="ai-model"
                        value={m.id}
                        checked={preferredModel === m.id}
                        onChange={() => { setPreferredModel(m.id); setSettingsOpen(false) }}
                      />
                      <span>
                        <strong>{m.label}</strong>
                        <span className="ai-settings-model-desc">{m.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Close button */}
          <button className="ai-panel-close" onClick={toggleChat} title="Close" type="button">
            ✕
          </button>
        </div>
      </div>

      {/* Relationship bar */}
      <div className="ai-relationship-bar-wrap" title={`Trust: ${trustPct}/100 · ${modeLabel}`}>
        <div
          className="ai-relationship-bar-fill"
          style={{ width: `${trustPct}%` }}
        />
        <span className="ai-relationship-label">{modeLabel}</span>
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
