// ============================================================
// Groq API proxy — keeps GROQ_API_KEY server-side (never in browser)
//
// Deploy:
//   supabase functions deploy groq-proxy
//   supabase secrets set GROQ_API_KEY=<your-key>
// ============================================================

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  // Require a Bearer token and the Supabase anon key
  const authHeader = req.headers.get('Authorization')
  const apiKey     = req.headers.get('apikey')
  if (!authHeader?.startsWith('Bearer ') || !apiKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const groqKey = Deno.env.get('GROQ_API_KEY')
  if (!groqKey) {
    return new Response(JSON.stringify({ error: 'GROQ_API_KEY secret not configured on server' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const body = await req.json()

  const groqResponse = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${groqKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!groqResponse.ok) {
    const errData = await groqResponse.json().catch(() => ({}))
    return new Response(JSON.stringify(errData), {
      status: groqResponse.status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  // Stream the Groq SSE response directly back to the client
  return new Response(groqResponse.body, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  })
})
