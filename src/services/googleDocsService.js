// ============================================================
// Google Docs Service
// Uses Google Identity Services (GIS) to:
//   1. Request an OAuth access token (drive.file scope)
//   2. Create a Google Doc via the Drive REST API
//   3. Set sharing to "anyone with link can edit"
//
// Setup required:
//   - Google Cloud Console → enable Drive API
//   - Create OAuth 2.0 Client ID (Web application)
//   - Add VITE_GOOGLE_CLIENT_ID to .env.local
//   - Authorized JS origins: http://localhost:5173 + production URL
// ============================================================

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPE     = 'https://www.googleapis.com/auth/drive.file'

let _tokenClient  = null
let _accessToken  = null
let _tokenExpiry  = 0

// ── Token client (lazily initialized after GIS script loads) ──────────────
function getTokenClient() {
  if (_tokenClient) return _tokenClient
  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services script not yet loaded. Try again in a moment.')
  }
  _tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope:     SCOPE,
    callback:  () => {}, // overridden per-request in requestToken()
  })
  return _tokenClient
}

// ── Request / reuse access token ──────────────────────────────────────────
export function isAuthorized() {
  return !!_accessToken && Date.now() < _tokenExpiry
}

export function requestToken() {
  return new Promise((resolve, reject) => {
    try {
      const client = getTokenClient()
      client.callback = (response) => {
        if (response.error) {
          reject(new Error(response.error_description ?? response.error))
        } else {
          _accessToken = response.access_token
          // Expire 60 s early to avoid edge-case expiry during a request
          _tokenExpiry = Date.now() + (response.expires_in - 60) * 1000
          resolve(_accessToken)
        }
      }
      // prompt: '' = skip consent screen if already granted; 'consent' = always show
      client.requestAccessToken({ prompt: isAuthorized() ? '' : 'consent' })
    } catch (e) {
      reject(e)
    }
  })
}

// ── Ensure we have a valid token, requesting one if needed ────────────────
async function ensureToken() {
  if (!isAuthorized()) await requestToken()
  return _accessToken
}

// ── Drive API helpers ─────────────────────────────────────────────────────
async function driveRequest(path, options = {}) {
  const token = await ensureToken()
  const res = await fetch(`https://www.googleapis.com/drive/v3${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error?.message ?? `Drive API error: ${res.status}`)
  }
  return res.json()
}

// ── Create a Google Doc and share it (anyone with link can edit) ───────────
export async function createGoogleDoc(title) {
  // 1. Create the document
  const file = await driveRequest('/files', {
    method: 'POST',
    body: JSON.stringify({
      name:     title,
      mimeType: 'application/vnd.google-apps.document',
    }),
  })

  // 2. Set sharing: anyone with the link can edit
  await driveRequest(`/files/${file.id}/permissions`, {
    method: 'POST',
    body: JSON.stringify({ role: 'writer', type: 'anyone' }),
  })

  return `https://docs.google.com/document/d/${file.id}/edit`
}

// ── Convert a share/edit URL to an embedded edit URL ─────────────────────
export function getEmbedUrl(docUrl) {
  if (!docUrl) return null
  const match = docUrl.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)
  if (!match) return null
  return `https://docs.google.com/document/d/${match[1]}/edit?embedded=true`
}
