// ============================================================
// Groq API Service — streaming chat completions
// Requires VITE_GROQ_API_KEY in .env.local
//
// Models:
//   Text only : llama-3.3-70b-versatile
//   With image: meta-llama/llama-4-scout-17b-16e-instruct
//
// PRODUCTION NOTE: Before going public, move API calls to a
// Supabase Edge Function so the key is never in the browser.
// ============================================================

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const TEXT_MODEL   = 'llama-3.3-70b-versatile'
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

/**
 * Async generator that streams chat completion chunks from Groq.
 *
 * @param {Array}   messages   OpenAI-format message array
 * @param {Object}  options
 * @param {boolean} options.hasImage  Use vision model when true
 * @yields {string} Text delta chunks
 */
export async function* streamChat(messages, { hasImage = false } = {}) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  if (!apiKey) {
    throw new Error(
      'Groq API key not found. Add VITE_GROQ_API_KEY to your .env.local file.'
    )
  }

  const model = hasImage ? VISION_MODEL : TEXT_MODEL

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: 0.85,
      max_tokens: 1024,
    }),
  })

  if (!response.ok) {
    let errMsg = `Groq API error ${response.status}`
    try {
      const errData = await response.json()
      errMsg = errData.error?.message || errMsg
    } catch { /* ignore parse error */ }
    throw new Error(errMsg)
  }

  const reader  = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? '' // keep incomplete line in buffer

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ')) continue

      const data = trimmed.slice(6)
      if (data === '[DONE]') return

      try {
        const json    = JSON.parse(data)
        const content = json.choices?.[0]?.delta?.content
        if (content) yield content
      } catch {
        // Skip malformed SSE chunk
      }
    }
  }
}
