import { useAI } from '@context/AIContext'

export default function CharacterSelector() {
  const { characterList, activeCharacterId, activeCharacter, charStats, switchCharacter } = useAI()

  // Get relationship label for a character
  const getRelLabel = (char) => {
    const stats = charStats?.[char.id]
    const mode  = stats?.relationship_mode ?? 'neutral'
    return char.dacs?.relationshipLabels?.[mode] ?? mode
  }

  return (
    <div className="char-selector">
      <div className="char-tabs">
        {characterList.map(char => {
          const isActive = char.id === activeCharacterId
          const relLabel = getRelLabel(char)

          return (
            <button
              key={char.id}
              className={`char-tab ${isActive ? 'active' : ''}`}
              style={{ '--char-color': char.accentColor }}
              onClick={() => switchCharacter(char.id)}
              title={`${char.name} · ${relLabel}`}
              type="button"
            >
              {char.avatarSrc
                ? (
                  <img
                    src={char.avatarSrc}
                    alt={char.name}
                    className="char-tab-img"
                  />
                )
                : (
                  <span
                    className="char-tab-initials"
                    style={{ color: char.accentColor }}
                  >
                    {char.name[0]}
                  </span>
                )
              }
            </button>
          )
        })}
      </div>

      <div className="char-active-info">
        <span className="char-active-name" style={{ color: activeCharacter?.accentColor }}>
          {activeCharacter?.name}
          <span className="char-game-label"> · {activeCharacter?.game}</span>
        </span>
        {activeCharacter && (
          <span
            className="char-relationship-label"
            style={{ color: activeCharacter.accentColor }}
          >
            {getRelLabel(activeCharacter)}
          </span>
        )}
      </div>
    </div>
  )
}
