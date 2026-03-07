// ============================================================
// AI Action Parser
// The AI embeds [ACTION:type:params] tags in its responses.
// This module strips them from display text and executes them.
//
// BLOCKED (learning writes — AI has read-only access):
//   log_learning_session, add_note
//
// NEEDS_CONFIRMATION (shown to user before execution):
//   complete_task, complete_habit, delete_task, update_task, add_task
//   add_appointment, update_appointment
//   add_workout_session, add_finance, delete_finance
//
// SILENT (execute immediately):
//   navigate, remember, update_stat, set_mood, add_workout (legacy)
// ============================================================

/** Validate that a string is a real YYYY-MM-DD date */
function isValidDate(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false
  const d = new Date(str + 'T00:00:00')
  return !isNaN(d.getTime())
}

const ACTION_REGEX = /\[ACTION:(\w+):([^\]]*)\]/g

/** Learning write actions — blocked entirely (read access remains) */
export const BLOCKED_ACTIONS = new Set(['log_learning_session', 'add_note'])

/** Data-changing actions that require explicit user confirmation */
export const NEEDS_CONFIRMATION = new Set([
  'complete_task', 'complete_habit', 'delete_task', 'update_task', 'add_task',
  'add_appointment', 'update_appointment',
  'add_workout_session', 'add_finance', 'delete_finance',
])

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
 * Generate a human-readable description for a pending action.
 * @param {string} type
 * @param {string} params
 * @param {Object} ctx - app state (tasks, habits, appointments)
 * @returns {string}
 */
export function describeAction(type, params, ctx) {
  switch (type) {
    case 'complete_task': {
      const task = (ctx.tasks ?? []).find(t => t.id === params)
      return task ? `Mark "${task.title}" as done` : `Mark task as done (${params})`
    }
    case 'complete_habit': {
      const habit = (ctx.habits ?? []).find(h => h.id === params)
      return habit ? `Mark habit "${habit.name}" as done today` : `Mark habit as done (${params})`
    }
    case 'delete_task': {
      const task = (ctx.tasks ?? []).find(t => t.id === params)
      return task ? `Delete task "${task.title}"` : `Delete task (${params})`
    }
    case 'update_task': {
      const parts = params.split('|')
      const task  = (ctx.tasks ?? []).find(t => t.id === parts[0]?.trim())
      const field = parts[1]?.trim()
      const value = parts.slice(2).join('|').trim()
      return task
        ? `Update "${task.title}": ${field} → ${value}`
        : `Update task ${parts[0]?.trim()}: ${field} → ${value}`
    }
    case 'add_task': {
      const parts = params.split('|')
      return `Add task: "${parts[0]?.trim()}" (${parts[1]?.trim() || 'medium'} priority)`
    }
    case 'add_appointment': {
      const parts = params.split('|')
      const time  = parts[2]?.trim()
      return `Add appointment: "${parts[0]?.trim()}" on ${parts[1]?.trim()}${time ? ' at ' + time : ''}`
    }
    case 'update_appointment': {
      const parts = params.split('|')
      const appt  = (ctx.appointments ?? []).find(a => a.id === parts[0]?.trim())
      const field = parts[1]?.trim()
      const value = parts.slice(2).join('|').trim()
      return appt
        ? `Update "${appt.title}": ${field} → ${value}`
        : `Update appointment ${parts[0]?.trim()}: ${field} → ${value}`
    }
    case 'add_workout_session': {
      const parts   = params.split('|')
      const exPart  = parts[3] || ''
      const exCount = exPart ? exPart.split(';').filter(Boolean).length : 0
      return `Log workout: "${parts[0]?.trim()}" (${parts[1]?.trim()}, ${exCount} exercise${exCount !== 1 ? 's' : ''})`
    }
    case 'add_finance': {
      const parts    = params.split('|')
      const ftype    = parts[0]?.trim()
      const amount   = parts[1]?.trim()
      const category = parts[2]?.trim()
      const desc     = parts[3]?.trim()
      return `Add ${ftype}: €${amount} [${category}]${desc ? ` "${desc}"` : ''}`
    }
    case 'delete_finance':
      return `Delete finance entry (${params})`
    default:
      return `${type}: ${params}`
  }
}

/**
 * Execute a single confirmed action (bypasses intent guards — user confirmed via button).
 * @param {{ type: string, params: string }} action
 * @param {Object} ctx - app functions + state
 * @returns {Promise<{type, description, success}>}
 */
export async function executeDataAction({ type, params }, ctx) {
  const result = { type, description: '', success: false }

  try {
    switch (type) {

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
        const parts      = params.split('|')
        const taskId     = parts[0]?.trim()
        const field      = parts[1]?.trim()
        const value      = parts.slice(2).join('|').trim()
        const task       = (ctx.tasks ?? []).find(t => t.id === taskId)
        const validFields = ['title', 'priority', 'dueDate', 'description', 'categories']
        if (!task)                       { result.description = `Task not found: ${taskId}`; break }
        if (!ctx.updateTask)             { result.description = 'updateTask not available'; break }
        // "status" is not a valid update_task field — route to completeTask when value means done
        if (field === 'status') {
          const completionValues = ['done', 'completed', 'complete', 'finished']
          if (completionValues.includes(value.toLowerCase()) && ctx.completeTask) {
            ctx.completeTask(taskId)
            result.description = `"${task.title}" marked done`
            result.success = true
          } else {
            result.description = `Cannot set status "${value}" — use complete_task instead`
          }
          break
        }
        if (!validFields.includes(field)) { result.description = `Invalid field: "${field}"`; break }
        if (field === 'dueDate' && !isValidDate(value)) {
          result.description = `Invalid dueDate: "${value}" (expected YYYY-MM-DD)`; break
        }
        const updates = field === 'categories'
          ? { categories: value.split(',').map(s => s.trim()).filter(Boolean) }
          : { [field]: value }
        ctx.updateTask(taskId, updates)
        result.description = `Task "${task.title}" updated: ${field} → ${value}`
        result.success = true
        break
      }

      case 'add_task': {
        const parts    = params.split('|')
        const title    = parts[0]?.trim()
        const priority = parts[1]?.trim() || 'medium'
        const category = parts[2]?.trim() || ''
        if (!title) { result.description = 'No title provided'; break }
        ctx.addTask({ title, priority, categories: category ? [category] : [] })
        result.description = `Task "${title}" added`
        result.success = true
        break
      }

      case 'add_appointment': {
        const parts       = params.split('|')
        const title       = parts[0]?.trim()
        const date        = parts[1]?.trim()
        const time        = parts[2]?.trim() || ''
        const description = parts[3]?.trim() || ''
        if (!title || !date) { result.description = 'Missing title or date'; break }
        if (!isValidDate(date)) { result.description = `Invalid date: "${date}" (expected YYYY-MM-DD)`; break }
        ctx.addAppointment({ title, date, time, description })
        result.description = `Appointment "${title}" added for ${date}${time ? ' at ' + time : ''}`
        result.success = true
        break
      }

      case 'update_appointment': {
        const parts      = params.split('|')
        const apptId     = parts[0]?.trim()
        const field      = parts[1]?.trim()
        const value      = parts.slice(2).join('|').trim()
        const appt       = (ctx.appointments ?? []).find(a => a.id === apptId)
        const validFields = ['title', 'date', 'time', 'endTime', 'location', 'description']
        if (!appt)                       { result.description = `Appointment not found: ${apptId}`; break }
        if (!validFields.includes(field)) { result.description = `Invalid field: "${field}"`; break }
        if (!ctx.updateAppointment)      { result.description = 'updateAppointment not available'; break }
        if (field === 'date' && !isValidDate(value)) {
          result.description = `Invalid date: "${value}" (expected YYYY-MM-DD)`; break
        }
        ctx.updateAppointment(apptId, { [field]: value })
        result.description = `Appointment "${appt.title}" updated: ${field} → ${value}`
        result.success = true
        break
      }

      case 'add_workout_session': {
        const parts    = params.split('|')
        const title    = parts[0]?.trim() || 'Workout'
        const category = parts[1]?.trim() || 'other'
        const date     = parts[2]?.trim() || new Date().toISOString().slice(0, 10)
        const exPart   = parts.slice(3).join('|').trim()
        const exercises = exPart
          ? exPart.split(';').map(ex => {
              const [name, setsStr, repsStr, weightStr, unit] = ex.split('/').map(s => s.trim())
              // Support comma-separated reps for variable reps per set: "5,4,3"
              const repsList = repsStr
                ? repsStr.split(',').map(r => parseInt(r.trim(), 10) || 0)
                : [0]
              return {
                name: name || 'Exercise',
                sets: repsList.length > 1
                  ? repsList.map(reps => ({ weight: parseFloat(weightStr) || 0, reps, unit: unit || 'kg' }))
                  : Array.from({ length: parseInt(setsStr, 10) || 1 }, () => ({
                      weight: parseFloat(weightStr) || 0,
                      reps:   repsList[0],
                      unit:   unit || 'kg',
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

      case 'add_finance': {
        const parts    = params.split('|')
        const ftype    = parts[0]?.trim()
        const amount   = parseFloat(parts[1]?.trim())
        const category = parts[2]?.trim() || 'other'
        const desc     = parts[3]?.trim() || ''
        const date     = parts[4]?.trim() || new Date().toISOString().slice(0, 10)
        if (!['income', 'expense'].includes(ftype)) {
          result.description = `Invalid type: ${ftype}`; break
        }
        if (isNaN(amount) || amount <= 0) {
          result.description = `Invalid amount: ${parts[1]}`; break
        }
        if (!ctx.addTransaction) { result.description = 'addTransaction not available'; break }
        ctx.addTransaction({ type: ftype, amount, category, description: desc, date })
        result.description = `Finance entry added: ${ftype} €${amount.toFixed(2)} [${category}]${desc ? ` "${desc}"` : ''}`
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

      default:
        result.description = `Unknown confirmable action: ${type}`
    }
  } catch (e) {
    result.description = `Action failed: ${e.message}`
  }

  return result
}

/**
 * Execute parsed actions against the app contexts.
 * - BLOCKED_ACTIONS: rejected with error result
 * - NEEDS_CONFIRMATION: deferred into `pending` array for user approval
 * - Everything else: executed silently, result goes into `executed`
 *
 * @param {Array}  actions     - from parseActions()
 * @param {Object} ctx         - all app functions + state
 * @param {string} userMessage - the raw user message (used for legacy guards on silent actions)
 * @returns {Promise<{ executed: Array<{type,description,success}>, pending: Array<{type,params,description,status}> }>}
 */
export async function executeActions(actions, ctx, userMessage = '') {
  const executed = []
  const pending  = []

  for (const { type, params } of actions) {

    // Block learning write actions
    if (BLOCKED_ACTIONS.has(type)) {
      executed.push({ type, description: 'Learning write access is disabled', success: false })
      continue
    }

    // Defer data-changing actions for user confirmation
    if (NEEDS_CONFIRMATION.has(type)) {
      pending.push({ type, params, description: describeAction(type, params, ctx), status: 'pending' })
      continue
    }

    // Execute silent actions immediately
    const result = { type, description: '', success: false }
    try {
      switch (type) {

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

        case 'navigate': {
          const page = params.trim()
          if (ctx.navigate) {
            ctx.navigate(page)
            result.description = `Navigated to ${page}`
            result.success = true
          }
          break
        }

        case 'remember': {
          if (ctx.remember) {
            await ctx.remember(params.trim())
            result.description = `Remembered: ${params.trim()}`
            result.success = true
          }
          break
        }

        case 'update_stat': {
          const [rawStat, rawDelta] = params.split('|')
          const rawStatName = rawStat?.trim()
          const statName = rawStatName && !rawStatName.endsWith('_level')
            ? `${rawStatName}_level`
            : rawStatName
          const delta      = parseInt(rawDelta?.trim(), 10)
          const validStats = ['respect_level', 'trust_level', 'attachment_level', 'attraction_level']
          if (!statName || !validStats.includes(statName)) {
            result.description = `Unknown stat: ${statName}`; break
          }
          if (isNaN(delta) || delta === 0) {
            result.description = `Invalid delta for ${statName}`; break
          }
          const clampedDelta = Math.max(-10, Math.min(10, delta))
          if (ctx.updateCharStat) {
            ctx.updateCharStat(statName, clampedDelta)
            result.description = `${statName} ${clampedDelta > 0 ? '+' : ''}${clampedDelta}`
            result.success = true
          }
          break
        }

        case 'set_mood': {
          const mood       = params.trim()
          const validMoods = ['neutral', 'composed', 'teasing', 'warm', 'proud', 'disappointed',
                              'protective', 'intimate', 'vulnerable', 'firm']
          if (!validMoods.includes(mood)) {
            result.description = `Unknown mood: ${mood}`; break
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

    executed.push(result)
  }

  return { executed, pending }
}
