/**
 * XP required to REACH level N (cumulative from 0).
 * Formula: floor(100 * (N-1)^1.5)
 * Level 1:  0 XP  | Level 2:  100 XP | Level 3:  283 XP
 * Level 5:  800 XP | Level 10: 2,846 XP | Level 20: 9,051 XP
 */
export function xpRequiredForLevel(level) {
  if (level <= 1) return 0
  return Math.floor(100 * Math.pow(level - 1, 1.5))
}

export function levelFromXP(totalXP) {
  if (totalXP <= 0) return 1
  let level = 1
  while (xpRequiredForLevel(level + 1) <= totalXP) {
    level++
  }
  return level
}

export function xpToNextLevel(totalXP) {
  const currentLevel = levelFromXP(totalXP)
  return xpRequiredForLevel(currentLevel + 1) - totalXP
}

export function progressPercent(totalXP) {
  const currentLevel = levelFromXP(totalXP)
  const floor   = xpRequiredForLevel(currentLevel)
  const ceiling = xpRequiredForLevel(currentLevel + 1)
  const span = ceiling - floor
  if (span === 0) return 100
  return Math.min(100, Math.max(0, Math.floor(((totalXP - floor) / span) * 100)))
}

export function getXPForTask(priority) {
  const map = { low: 10, medium: 25, high: 50 }
  return map[priority] ?? 10
}

export const HABIT_MASTERY_THRESHOLD = 90

/**
 * Returns the daily XP awarded for completing a habit.
 *
 * INTENTIONAL DESIGN: mastered habits give LESS daily XP (5) than
 * non-mastered habits (15). The idea is that once a habit is fully
 * automated (≥90-day streak), the big reward is the one-time mastery
 * bonus (+500 XP via getStreakBonusXP). Routine completions after that
 * are low-value to encourage pursuing *new* habits over coasting.
 *
 * Non-mastered → 15 XP  (actively building the habit)
 * Mastered     →  5 XP  (maintenance; mastery milestone already rewarded)
 */
export function getXPForHabit(mastered = false) {
  return mastered ? 5 : 15
}

export function getStreakBonusXP(streak) {
  if (streak === 100) return 500
  if (streak === 90)  return 500  // mastery achievement
  if (streak === 30)  return 100
  if (streak === 7)   return 25
  // Monthly maintenance bonus every 30 days after mastery (120, 150, 180…)
  if (streak > 90 && streak % 30 === 0) return 100
  return 0
}

export function computeGlobalXP(categoriesMap) {
  return Object.values(categoriesMap).reduce((sum, cat) => sum + (cat.totalXP ?? 0), 0)
}

export function getLevelTitle(level) {
  if (level >= 50) return 'Ascendant'
  if (level >= 30) return 'Legendary'
  if (level >= 20) return 'Master'
  if (level >= 15) return 'Expert'
  if (level >= 10) return 'Adept'
  if (level >= 7)  return 'Journeyman'
  if (level >= 4)  return 'Apprentice'
  return 'Initiate'
}
