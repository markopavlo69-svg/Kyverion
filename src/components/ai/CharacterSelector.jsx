import { useAI } from '@context/AIContext'

export default function CharacterSelector() {
  const { characterList, activeCharacterId, activeCharacter, switchCharacter } = useAI()

  return (
    <div className="char-selector">
      <div className="char-tabs">
        {characterList.map(char => {
          const isActive = char.id === activeCharacterId
          return (
            <button
              key={char.id}
              className={`char-tab ${isActive ? 'active' : ''}`}
              style={{ '--char-color': char.accentColor }}
              onClick={() => switchCharacter(char.id)}
              title={`${char.name} · ${char.game}`}
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

      <span className="char-active-name" style={{ color: activeCharacter?.accentColor }}>
        {activeCharacter?.name}
        <span className="char-game-label"> · {activeCharacter?.game}</span>
      </span>
    </div>
  )
}
