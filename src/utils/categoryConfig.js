export const CATEGORIES = {
  strength: {
    id:      'strength',
    name:    'Strength',
    icon:    '⚔️',
    color:   '#ef4444',
    cssVar:  '--cat-strength',
  },
  intelligence: {
    id:      'intelligence',
    name:    'Intelligence',
    icon:    '🧠',
    color:   '#3b82f6',
    cssVar:  '--cat-intelligence',
  },
  creativity: {
    id:      'creativity',
    name:    'Creativity',
    icon:    '🎨',
    color:   '#a855f7',
    cssVar:  '--cat-creativity',
  },
  discipline: {
    id:      'discipline',
    name:    'Discipline',
    icon:    '🛡️',
    color:   '#06b6d4',
    cssVar:  '--cat-discipline',
  },
  social: {
    id:      'social',
    name:    'Social',
    icon:    '💬',
    color:   '#f59e0b',
    cssVar:  '--cat-social',
  },
  vitality: {
    id:      'vitality',
    name:    'Vitality',
    icon:    '💚',
    color:   '#10b981',
    cssVar:  '--cat-vitality',
  },
}

export const CATEGORY_LIST = Object.values(CATEGORIES)

export const getCategoryColor = (id) => CATEGORIES[id]?.color ?? '#00d4ff'
export const getCategoryIcon  = (id) => CATEGORIES[id]?.icon  ?? '❓'
export const getCategoryName  = (id) => CATEGORIES[id]?.name  ?? id
