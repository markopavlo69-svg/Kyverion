// ============================================================
// AI Action Parser
// The AI embeds [ACTION:type:params] tags in its responses.
// This module strips them from display text and executes them.
//
// Supported actions:
//   [ACTION:complete_habit:HABIT_ID]
//   [ACTION:complete_task:TASK_ID]
//   [ACTION:add_task:TITLE|PRIORITY|CATEGORY]
//   [ACTION:add_appointment:TITLE|DATE|TIME|DESCRIPTION]
//   [ACTION:navigate:PAGE_NAME]
//   [ACTION:remember:FACT_TO_REMEMBER]
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
 * @param {Object} ctx      - { tasks, habits, completeHabitToday, completeTask,
 *                             addTask, addAppointment, navigate, remember }
 * @returns {Promise<Array<{type, description, success}>>}
 */
export async function executeActions(actions, ctx) {
  const results = []

  for (const { type, params } of actions) {
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

        case 'add_appointment': {
          const parts = params.split('|')
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
