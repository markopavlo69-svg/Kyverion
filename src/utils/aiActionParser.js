// ============================================================
// AI Action Parser
// The AI embeds [ACTION:type:params] tags in its responses.
// This module strips them from display text and executes them.
//
// Supported actions:
//   [ACTION:complete_habit:HABIT_ID]
//   [ACTION:complete_task:TASK_ID]
//   [ACTION:delete_task:TASK_ID]
//   [ACTION:update_task:TASK_ID|FIELD|VALUE]         — field: title/priority/dueDate/description
//   [ACTION:add_task:TITLE|PRIORITY|CATEGORY]
//   [ACTION:add_appointment:TITLE|DATE|TIME|DESCRIPTION]
//   [ACTION:add_workout_session:TITLE|CATEGORY|DATE|EXERCISES]
//     EXERCISES format: "name/sets/reps/weight/unit;name2/sets2/reps2/weight2/unit2"
//     e.g. "Push-up/3/15/0/bodyweight;Squat/4/12/0/bodyweight"
//   [ACTION:add_finance:TYPE|AMOUNT|CATEGORY|DESC|DATE]
//     TYPE: income or expense
//   [ACTION:delete_finance:TRANSACTION_ID]
//   [ACTION:log_learning_session:AREA_ID|MINUTES]
//   [ACTION:add_note:AREA_ID|TITLE|CONTENT]
//   [ACTION:navigate:PAGE_NAME]
//   [ACTION:remember:FACT_TO_REMEMBER]
//   [ACTION:update_stat:STAT_NAME|+/-DELTA]          — e.g. trust_level|+5
//   [ACTION:set_mood:MOOD_NAME]                      — e.g. warm
// ============================================================

const ACTION_REGEX = /\[ACTION:(\w+):([^\]]*)\]/g

/**
 * Strip action tags from AI response text, return clean text + parsed actions.
 * @param {string} text
 * @returns {{ cleanText: string, actions: Array<{type, params}> }}
 */
export function parseActions(text) {
  const actions = []

  const cleanText = text
    .replace(ACTION_REGEX, (_, type, params) => {
      actions.push({ type, params: params.trim() })
      return ''
    })
    .replace(/\n{3,}/g, '\n\n') // collapse triple newlines left by removed tags
    .trim()

  return { cleanText, actions }
}

/**
 * Execute parsed actions against the app contexts.
 * @param {Array}  actions  - from parseActions()
 * @param {Object} ctx      - all app functions + handlers
 * @returns {Promise<Array<{type, description, success}>>}
 */
export async function executeActions(actions, ctx) {
  const results = []

  for (const { type, params } of actions) {
    const result = { type, description: '', success: false }

    try {
      switch (type) {

        // ── Habits ─────────────────────────────────────────────────
        case 'complete_habit': {
          const habit = (ctx.habits ?? []).find(h => h.id === params)
          if (habit) {
            ctx.completeHabitToday(params)
            result.description = `"${habit.name}" marked done`
            result.success = true
          } else {
            result.description = `Habit not found: ${params}`
          }
          break
        }

        // ── Tasks ──────────────────────────────────────────────────
        case 'complete_task': {
          const task = (ctx.tasks ?? []).find(t => t.id === params)
          if (task) {
            ctx.completeTask(params)
            result.description = `"${task.title}" marked done`
            result.success = true
          } else {
            result.description = `Task not found: ${params}`
          }
          break
        }

        case 'delete_task': {
          const task = (ctx.tasks ?? []).find(t => t.id === params)
          if (task && ctx.deleteTask) {
            ctx.deleteTask(params)
            result.description = `"${task.title}" deleted`
            result.success = true
          } else {
            result.description = task ? 'deleteTask not available' : `Task not found: ${params}`
          }
          break
        }

        case 'update_task': {
          // params: "TASK_ID|FIELD|VALUE"
          const parts   = params.split('|')
          const taskId  = parts[0]?.trim()
          const field   = parts[1]?.trim()
          const value   = parts.slice(2).join('|').trim() // allow | in value
          const task    = (ctx.tasks ?? []).find(t => t.id === taskId)
          const validFields = ['title', 'priority', 'dueDate', 'description', 'categories']
          if (!task) { result.description = `Task not found: ${taskId}`; break }
          if (!validFields.includes(field)) { result.description = `Invalid field: ${field}`; break }
          if (!ctx.updateTask) { result.description = 'updateTask not available'; break }
          const updates = field === 'categories'
            ? { categories: value.split(',').map(s => s.trim()).filter(Boolean) }
            : { [field]: value }
          ctx.updateTask(taskId, updates)
          result.description = `Task "${task.title}" updated: ${field} = ${value}`
          result.success = true
          break
        }

        case 'add_task': {
          const parts    = params.split('|')
          const title    = parts[0]?.trim()
          const priority = parts[1]?.trim() || 'medium'
          const category = parts[2]?.trim() || ''
          if (!title) { result.description = 'No title provided'; break }
          const categories = category ? [category] : []
          ctx.addTask({ title, priority, categories })
          result.description = `Task "${title}" added`
          result.success = true
          break
        }

        // ── Appointments ────────────────────────────────────────────
        case 'add_appointment': {
          const parts       = params.split('|')
          const title       = parts[0]?.trim()
          const date        = parts[1]?.trim()
          const time        = parts[2]?.trim() || ''
          const description = parts[3]?.trim() || ''
          if (!title || !date) { result.description = 'Missing title or date'; break }
          ctx.addAppointment({ title, date, time, description })
          result.description = `Appointment "${title}" added for ${date}${time ? ' at ' + time : ''}`
          result.success = true
          break
        }

        // ── Workout ─────────────────────────────────────────────────
        case 'add_workout': {
          // Legacy simple action: creates empty workout and navigates
          const parts    = params.split('|')
          const title    = parts[0]?.trim() || ''
          const category = parts[1]?.trim() || 'other'
          if (ctx.addEmptyWorkout) {
            await ctx.addEmptyWorkout(title, category)
            result.description = `Workout session "${title || category}" created`
            result.success = true
            if (ctx.navigate) ctx.navigate('workout')
          }
          break
        }

        case 'add_workout_session': {
          // Full workout session with exercises
          // params: "TITLE|CATEGORY|DATE|name/sets/reps/weight/unit;name2/..."
          const parts    = params.split('|')
          const title    = parts[0]?.trim() || 'Workout'
          const category = parts[1]?.trim() || 'other'
          const date     = parts[2]?.trim() || new Date().toISOString().slice(0, 10)
          const exPart   = parts.slice(3).join('|').trim()

          const exercises = exPart
            ? exPart.split(';').map(ex => {
                const [name, setsStr, repsStr, weightStr, unit] = ex.split('/').map(s => s.trim())
                const sets    = parseInt(setsStr, 10)  || 1
                const reps    = parseInt(repsStr, 10)  || 0
                const weight  = parseFloat(weightStr)  || 0
                return {
                  name: name || 'Exercise',
                  sets: Array.from({ length: sets }, () => ({
                    weight,
                    reps,
                    unit: unit || 'kg',
                  })),
                }
              })
            : []

          if (ctx.addWorkoutSession) {
            await ctx.addWorkoutSession(category, title, '', date, exercises)
            result.description = `Workout "${title}" (${exercises.length} exercise${exercises.length !== 1 ? 's' : ''}) added for ${date}`
            result.success = true
          } else {
            result.description = 'addWorkoutSession not available'
          }
          break
        }

        // ── Finance ─────────────────────────────────────────────────
        case 'add_finance': {
          // params: "TYPE|AMOUNT|CATEGORY|DESC|DATE"
          const parts    = params.split('|')
          const type     = parts[0]?.trim()
          const amount   = parseFloat(parts[1]?.trim())
          const category = parts[2]?.trim() || 'other'
          const desc     = parts[3]?.trim() || ''
          const date     = parts[4]?.trim() || new Date().toISOString().slice(0, 10)

          if (!['income', 'expense'].includes(type)) {
            result.description = `Invalid type: ${type} (must be income or expense)`
            break
          }
          if (isNaN(amount) || amount <= 0) {
            result.description = `Invalid amount: ${parts[1]}`
            break
          }
          if (!ctx.addTransaction) { result.description = 'addTransaction not available'; break }

          ctx.addTransaction({ type, amount, category, description: desc, date })
          result.description = `Finance entry added: ${type} €${amount.toFixed(2)} [${category}] "${desc}" on ${date}`
          result.success = true
          break
        }

        case 'delete_finance': {
          if (!ctx.deleteTransaction) { result.description = 'deleteTransaction not available'; break }
          ctx.deleteTransaction(params)
          result.description = `Finance entry ${params} deleted`
          result.success = true
          break
        }

        // ── Learning ─────────────────────────────────────────────────
        case 'log_learning_session': {
          // params: "AREA_ID|MINUTES"
          const [areaId, minsStr] = params.split('|')
          const minutes = parseFloat(minsStr?.trim())
          if (!areaId?.trim()) { result.description = 'No area ID provided'; break }
          if (isNaN(minutes) || minutes <= 0) { result.description = `Invalid duration: ${minsStr}`; break }
          if (!ctx.logLearningSession) { result.description = 'logLearningSession not available'; break }
          ctx.logLearningSession(areaId.trim(), minutes)
          result.description = `Logged ${minutes} min learning session for area ${areaId.trim()}`
          result.success = true
          break
        }

        case 'add_note': {
          // params: "AREA_ID|TITLE|CONTENT"
          const noteParts = params.split('|')
          const areaId    = noteParts[0]?.trim()
          const noteTitle = noteParts[1]?.trim() || 'Note'
          const content   = noteParts.slice(2).join('|').trim()
          if (!areaId) { result.description = 'No area ID provided'; break }
          if (!ctx.addNote) { result.description = 'addNote not available'; break }
          ctx.addNote(areaId, { title: noteTitle, content })
          result.description = `Note "${noteTitle}" added to area ${areaId}`
          result.success = true
          break
        }

        // ── Navigation ────────────────────────────────────────────────
        case 'navigate': {
          const page = params.trim()
          if (ctx.navigate) {
            ctx.navigate(page)
            result.description = `Navigated to ${page}`
            result.success = true
          }
          break
        }

        // ── Memory ────────────────────────────────────────────────────
        case 'remember': {
          if (ctx.remember) {
            await ctx.remember(params.trim())
            result.description = `Remembered: ${params.trim()}`
            result.success = true
          }
          break
        }

        // ── DACS: update a relationship stat ───────────────────────
        case 'update_stat': {
          // params format: "trust_level|+8" or "respect_level|-5"
          const [rawStat, rawDelta] = params.split('|')
          // Normalize: allow shorthand ("respect") or full name ("respect_level")
          const rawStatName = rawStat?.trim()
          const statName = rawStatName && !rawStatName.endsWith('_level')
            ? `${rawStatName}_level`
            : rawStatName
          const delta    = parseInt(rawDelta?.trim(), 10)
          const validStats = ['respect_level', 'trust_level', 'attachment_level', 'attraction_level']

          if (!statName || !validStats.includes(statName)) {
            result.description = `Unknown stat: ${statName}`
            break
          }
          if (isNaN(delta) || delta === 0) {
            result.description = `Invalid delta for ${statName}`
            break
          }
          // Cap delta at ±10 per message to prevent abuse
          const clampedDelta = Math.max(-10, Math.min(10, delta))
          if (ctx.updateCharStat) {
            ctx.updateCharStat(statName, clampedDelta)
            result.description = `${statName} ${clampedDelta > 0 ? '+' : ''}${clampedDelta}`
            result.success = true
          }
          break
        }

        // ── DACS: set current mood ──────────────────────────────────
        case 'set_mood': {
          const mood = params.trim()
          const validMoods = ['neutral', 'composed', 'teasing', 'warm', 'proud', 'disappointed',
                              'protective', 'intimate', 'vulnerable', 'firm']
          if (!validMoods.includes(mood)) {
            result.description = `Unknown mood: ${mood}`
            break
          }
          if (ctx.setCharMood) {
            ctx.setCharMood(mood)
            result.description = `Mood → ${mood}`
            result.success = true
          }
          break
        }

        default:
          result.description = `Unknown action: ${type}`
      }
    } catch (e) {
      result.description = `Action failed: ${e.message}`
    }

    results.push(result)
  }

  return results
}
