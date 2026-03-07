// ============================================================
// Groq API Service — streaming chat completions via Edge Function proxy
//
// Requests route through supabase/functions/groq-proxy/index.ts
// which holds the Groq API key server-side (never in browser).
//
// Deploy: supabase functions deploy groq-proxy
// Secret: supabase secrets set GROQ_API_KEY=<your-key>
// Then:   remove VITE_GROQ_API_KEY from .env.local
// ============================================================

const PROXY_URL     = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/groq-proxy`
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

const VISION_MODEL  = 'meta-llama/llama-4-scout-17b-16e-instruct'

export const DEFAULT_MODEL = 'llama-3.3-70b-versatile'

export const AVAILABLE_MODELS = [
  {
    id:          'llama-3.3-70b-versatile',
    label:       'Llama 3.3 70B',
    description: 'Default — fast, natural conversation',
  },
]

// Retry with exponential backoff — retries on 429 (rate limit) and 5xx (server errors)
async function fetchWithRetry(fetchFn, maxRetries = 3) {
  const delays = [1000, 2000, 4000]
  let response
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    response = await fetchFn()
    if (response.ok) return response
    // Non-retryable: client errors except rate limit
    if (response.status !== 429 && response.status < 500) return response
    if (attempt < maxRetries) await new Promise(r => setTimeout(r, delays[attempt]))
  }
  return response
}

/**
 * Non-streaming single completion — used for background tasks like summarization.
 * Returns the response text or null on failure.
 */
export async function fetchCompletion(messages, { model, maxTokens = 600 } = {}) {
  const response = await fetchWithRetry(() => fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON}`,
      'apikey':        SUPABASE_ANON,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model:       model ?? DEFAULT_MODEL,
      messages,
      stream:      false,
      temperature: 0.3,
      max_tokens:  maxTokens,
    }),
  }))
  if (!response.ok) return null
  try {
    const data = await response.json()
    return data.choices?.[0]?.message?.content?.trim() ?? null
  } catch {
    return null
  }
}

/**
 * Async generator that streams chat completion chunks via the Groq proxy.
 *
 * @param {Array}   messages          OpenAI-format message array
 * @param {Object}  options
 * @param {boolean} options.hasImage  Use vision model when true
 * @param {string}  options.model     Override text model (ignored when hasImage)
 * @yields {string} Text delta chunks
 */
export async function* streamChat(messages, { hasImage = false, model } = {}) {
  const selectedModel = hasImage ? VISION_MODEL : (model ?? DEFAULT_MODEL)

  const response = await fetchWithRetry(() => fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON}`,
      'apikey':        SUPABASE_ANON,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model:       selectedModel,
      messages,
      stream:      true,
      temperature: 0.70,
      max_tokens:  3072,
    }),
  }))

  if (!response.ok) {
    let errMsg = `Proxy error ${response.status}`
    try {
      const errData = await response.json()
      errMsg = errData.error?.message ?? errMsg
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
    buffer = lines.pop() ?? ''

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
