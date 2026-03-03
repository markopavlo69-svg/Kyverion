import { useState } from 'react'
import { useLearning } from '@context/LearningContext'
import { getEmbedUrl } from '@services/googleDocsService'

export default function DocViewer({ area }) {
  const { setAreaDocUrl } = useLearning()
  const [urlInput, setUrlInput] = useState('')
  const [error,    setError]    = useState(null)

  const docUrl  = area.docUrl ?? null
  const embedUrl = getEmbedUrl(docUrl)

  function handleLink(e) {
    e.preventDefault()
    const url = urlInput.trim()
    if (!url) return
    if (!getEmbedUrl(url)) {
      setError('Not a valid Google Docs URL. It should contain /document/d/…')
      return
    }
    setError(null)
    setAreaDocUrl(area.id, url)
    setUrlInput('')
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
          Create a doc in Google Docs, then paste the link here to embed it.
        </p>

        <form className="doc-viewer__paste" onSubmit={handleLink}>
          <input
            className="form-input"
            placeholder="https://docs.google.com/document/d/..."
            value={urlInput}
            onChange={e => { setUrlInput(e.target.value); setError(null) }}
            type="url"
            autoFocus
          />
          <button type="submit" className="btn btn--primary btn--sm">Link Doc</button>
        </form>

        {error && <p className="doc-viewer__error">{error}</p>}

        <p className="doc-viewer__hint">
          Make sure sharing is set to "Anyone with the link can edit" in Google Docs.
        </p>
      </div>
    </div>
  )
}
