// ============================================================
// Chat completion service — Groq + OpenRouter
//
// Groq:       VITE_GROQ_API_KEY        (llama-3.3-70b-versatile)
// OpenRouter: VITE_OPENROUTER_API_KEY  (deepseek/deepseek-r1:free)
//
// PRODUCTION NOTE: Before going public, move API calls to a
// Supabase Edge Function so keys are never in the browser bundle.
// ============================================================

const GROQ_API_URL       = 'https://api.groq.com/openai/v1/chat/completions'
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Vision always goes through Groq
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

export const DEFAULT_MODEL = 'llama-3.3-70b-versatile'

// Models that should be routed to OpenRouter instead of Groq
const OPENROUTER_MODEL_IDS = new Set([
  'deepseek/deepseek-r1:free',
])

export const AVAILABLE_MODELS = [
  {
    id:          'llama-3.3-70b-versatile',
    label:       'Llama 3.3 70B',
    description: 'Default — fast, natural conversation',
  },
  {
    id:          'deepseek/deepseek-r1:free',
    label:       'DeepSeek R1',
    description: 'Reasoning model — more deliberate, slower responses',
  },
]

/**
 * Async generator that streams chat completion chunks.
 * Routes to Groq or OpenRouter based on the selected model.
 * Strips DeepSeek R1 <think>…</think> reasoning tokens before yielding.
 *
 * @param {Array}   messages          OpenAI-format message array
 * @param {Object}  options
 * @param {boolean} options.hasImage  Use vision model when true
 * @param {string}  options.model     Override text model (ignored when hasImage)
 * @yields {string} Text delta chunks
 */
export async function* streamChat(messages, { hasImage = false, model } = {}) {
  const selectedModel = hasImage ? VISION_MODEL : (model ?? DEFAULT_MODEL)
  const useOpenRouter = !hasImage && OPENROUTER_MODEL_IDS.has(selectedModel)

  // ── Pick provider ─────────────────────────────────────────────────────────
  const url    = useOpenRouter ? OPENROUTER_API_URL : GROQ_API_URL
  const apiKey = useOpenRouter
    ? import.meta.env.VITE_OPENROUTER_API_KEY
    : import.meta.env.VITE_GROQ_API_KEY

  if (!apiKey) {
    throw new Error(
      useOpenRouter
        ? 'OpenRouter API key not found. Add VITE_OPENROUTER_API_KEY to your .env.local file.'
        : 'Groq API key not found. Add VITE_GROQ_API_KEY to your .env.local file.'
    )
  }

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type':  'application/json',
  }
  // OpenRouter requires site info headers
  if (useOpenRouter) {
    headers['HTTP-Referer'] = window.location.origin
    headers['X-Title']      = 'Kyverion'
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model:       selectedModel,
      messages,
      stream:      true,
      temperature: 0.70,
      max_tokens:  1024,
    }),
  })

  if (!response.ok) {
    let errMsg = `API error ${response.status}`
    try {
      const errData = await response.json()
      errMsg = errData.error?.message ?? errMsg
    } catch { /* ignore parse error */ }
    throw new Error(errMsg)
  }

  // ── Stream SSE ────────────────────────────────────────────────────────────
  const reader  = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  // DeepSeek R1 prefixes responses with <think>…</think> reasoning tokens.
  // Buffer them and only yield content after </think>.
  const stripThink = selectedModel.includes('deepseek-r1')
  let thinkBuffer = ''
  let pastThink   = !stripThink // if not R1, skip filter entirely

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ')) continue

      const data = trimmed.slice(6)
      if (data === '[DONE]') return

      try {
        const json    = JSON.parse(data)
        const content = json.choices?.[0]?.delta?.content
        if (!content) continue

        if (pastThink) {
          yield content
        } else {
          // Still inside (or looking for) the think block
          thinkBuffer += content
          const endIdx = thinkBuffer.indexOf('</think>')
          if (endIdx !== -1) {
            pastThink = true
            // Yield everything after the closing tag, trimming leading whitespace
            const afterThink = thinkBuffer.slice(endIdx + 8).trimStart()
            if (afterThink) yield afterThink
            thinkBuffer = ''
          }
        }
      } catch {
        // Skip malformed SSE chunk
      }
    }
  }
}
