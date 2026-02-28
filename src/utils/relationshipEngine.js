// ============================================================
// Relationship Engine — Dynamic Accountability Character System
// Pure utility module (no React, no side effects).
// ============================================================

/**
 * Derive the relationship mode from a character's stats.
 * Thresholds are intentionally high to make progression realistic/slow.
 *
 * Modes (ascending closeness):
 *   neutral → acquaintance → rival / friend → close_friend → family / romantic
 */
export function deriveRelationshipMode({ trust_level = 0, attachment_level = 0, attraction_level = 0, respect_level = 0 }) {
  // Romantic: hardest to reach — requires trust, attachment AND attraction
  if (trust_level >= 70 && attachment_level >= 65 && attraction_level >= 55) return 'romantic'

  // Family bond: deep trust + attachment but not romantic
  if (trust_level >= 75 && attachment_level >= 70 && attraction_level < 40) return 'family'

  // Close friend
  if (trust_level >= 55 && attachment_level >= 45) return 'close_friend'

  // Rival: high respect but trust hasn't caught up yet (earned their attention, not their heart)
  if (respect_level > 60 && trust_level < 35) return 'rival'

  // Friend
  if (trust_level >= 35 && attachment_level >= 20) return 'friend'

  // Acquaintance
  if (trust_level >= 15) return 'acquaintance'

  return 'neutral'
}

/**
 * Compute a 0-100 discipline score: percentage of the last 7 days
 * where the user completed at least one task or habit.
 *
 * @param {Array} tasks  - task objects with completedAt ISO string
 * @param {Array} habits - habit objects with completions array of { date: 'YYYY-MM-DD' }
 * @returns {number} 0-100
 */
export function computeDisciplineScore(tasks, habits) {
  const today = new Date()
  let activeDays = 0

  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const day = d.toISOString().slice(0, 10)

    const tasksDone  = (tasks  ?? []).filter(t => t.completedAt?.startsWith(day)).length
    const habitsDone = (habits ?? []).filter(h => h.completions?.some(c => c.date === day)).length

    if (tasksDone + habitsDone > 0) activeDays++
  }

  return Math.round((activeDays / 7) * 100)
}

/**
 * Clamp a stat value to the 0-100 range.
 * @param {number} value
 * @returns {number}
 */
export function clampStat(value) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

/**
 * Default stats for a brand-new character relationship.
 * Individual characters override these via their dacs.startStats.
 */
export const DEFAULT_CHAR_STATS = {
  respect_level:   10,
  trust_level:     5,
  attachment_level: 0,
  attraction_level: 0,
  current_mood:    'neutral',
  relationship_mode: 'neutral',
}
