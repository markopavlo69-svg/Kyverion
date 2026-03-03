import { useState } from 'react'
import { useLearning } from '@context/LearningContext'
import { createGoogleDoc, getEmbedUrl } from '@services/googleDocsService'

export default function DocViewer({ area }) {
  const { setAreaDocUrl } = useLearning()
  const [loading,   setLoading]   = useState(false)
  const [showPaste, setShowPaste] = useState(false)
  const [urlInput,  setUrlInput]  = useState('')
  const [error,     setError]     = useState(null)

  const docUrl  = area.docUrl ?? null
  const embedUrl = getEmbedUrl(docUrl)

  // ── Create a new doc via Drive API ──────────────────────────────────────
  async function handleCreate() {
    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      setError('VITE_GOOGLE_CLIENT_ID is not set. Add it to your .env.local file.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const url = await createGoogleDoc(`${area.name} — Notes`)
      setAreaDocUrl(area.id, url)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Link an existing doc URL ─────────────────────────────────────────────
  function handlePaste(e) {
    e.preventDefault()
    const url = urlInput.trim()
    if (!url) return
    if (!getEmbedUrl(url)) {
      setError('Not a valid Google Docs URL. It should contain /document/d/...')
      return
    }
    setError(null)
    setAreaDocUrl(area.id, url)
    setUrlInput('')
    setShowPaste(false)
  }

  function handleUnlink() {
    setAreaDocUrl(area.id, null)
  }

  // ── Embedded doc view ────────────────────────────────────────────────────
  if (embedUrl) {
    return (
      <div className="doc-viewer">
        <div className="doc-viewer__toolbar">
          <a
            href={docUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--ghost btn--sm"
          >
            Open in Google Docs ↗
          </a>
          <button
            className="btn btn--ghost btn--sm btn--danger-ghost"
            onClick={handleUnlink}
          >
            Unlink
          </button>
        </div>
        <iframe
          src={embedUrl}
          className="doc-viewer__frame"
          title={`${area.name} — Notes`}
          frameBorder="0"
          allowFullScreen
        />
      </div>
    )
  }

  // ── Setup view (no doc linked yet) ───────────────────────────────────────
  return (
    <div className="doc-viewer doc-viewer--empty">
      <div className="doc-viewer__setup">
        <div className="doc-viewer__icon">📄</div>
        <h3 className="doc-viewer__title">Link a Google Doc</h3>
        <p className="doc-viewer__desc">
          Create a new doc or attach an existing one. Docs are opened directly inside the app.
        </p>

        <div className="doc-viewer__actions">
          <button
            className="btn btn--primary"
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? 'Creating…' : '+ Create Google Doc'}
          </button>
          <button
            className="btn btn--ghost"
            onClick={() => { setShowPaste(v => !v); setError(null) }}
          >
            Paste existing URL
          </button>
        </div>

        {showPaste && (
          <form className="doc-viewer__paste" onSubmit={handlePaste}>
            <input
              className="form-input"
              placeholder="https://docs.google.com/document/d/..."
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              type="url"
              autoFocus
            />
            <div className="doc-viewer__paste-btns">
              <button type="submit" className="btn btn--primary btn--sm">Link</button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => { setShowPaste(false); setError(null) }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {error && <p className="doc-viewer__error">{error}</p>}

        <p className="doc-viewer__hint">
          Requires a Google account. Created docs are automatically shared — anyone with the link can edit.
        </p>
      </div>
    </div>
  )
}
