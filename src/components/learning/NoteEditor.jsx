import { useState, useEffect, useRef, useCallback } from 'react'
import { useLearning } from '@context/LearningContext'

// ── Markdown renderer ─────────────────────────────────────────

function esc(t) {
  return String(t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function inlineMd(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="md-inline-code">$1</code>')
}

export function renderMarkdown(raw) {
  if (!raw) return '<p class="md-empty">No content yet…</p>'

  // Extract fenced code blocks first to protect them
  const codeBlocks = []
  let s = raw.replace(/```[\s\S]*?```/g, match => {
    const inner = match.slice(3, -3).replace(/^\s*\n/, '')
    codeBlocks.push(inner)
    return `\x00CODE${codeBlocks.length - 1}\x00`
  })

  const lines = s.split('\n')
  let html = '', inUl = false, inOl = false

  const closeList = () => {
    if (inUl) { html += '</ul>'; inUl = false }
    if (inOl) { html += '</ol>'; inOl = false }
  }

  for (const raw of lines) {
    // Restore code blocks that appear on their own line
    if (/^\x00CODE\d+\x00$/.test(raw.trim())) {
      closeList()
      const idx = parseInt(raw.trim().slice(5, -1))
      html += `<pre class="md-pre"><code>${esc(codeBlocks[idx])}</code></pre>`
      continue
    }

    const line = raw

    if (line.startsWith('# '))   { closeList(); html += `<h1 class="md-h1">${inlineMd(line.slice(2))}</h1>`; continue }
    if (line.startsWith('## '))  { closeList(); html += `<h2 class="md-h2">${inlineMd(line.slice(3))}</h2>`; continue }
    if (line.startsWith('### ')) { closeList(); html += `<h3 class="md-h3">${inlineMd(line.slice(4))}</h3>`; continue }
    if (/^---+$/.test(line.trim())) { closeList(); html += '<hr class="md-hr"/>'; continue }

    if (/^[-*] /.test(line)) {
      if (inOl) { html += '</ol>'; inOl = false }
      if (!inUl) { html += '<ul class="md-ul">'; inUl = true }
      html += `<li>${inlineMd(line.slice(2))}</li>`; continue
    }

    if (/^\d+\. /.test(line)) {
      if (inUl) { html += '</ul>'; inUl = false }
      if (!inOl) { html += '<ol class="md-ol">'; inOl = true }
      html += `<li>${inlineMd(line.replace(/^\d+\. /, ''))}</li>`; continue
    }

    closeList()
    if (line.trim() === '') { html += '<div class="md-spacer"></div>'; continue }
    html += `<p class="md-p">${inlineMd(line)}</p>`
  }

  closeList()
  return html
}

// ── Cursor helpers ────────────────────────────────────────────

function insertAtCursor(ta, before, after = '', placeholder = '') {
  const s   = ta.selectionStart
  const e   = ta.selectionEnd
  const sel = ta.value.slice(s, e) || placeholder
  const val = ta.value.slice(0, s) + before + sel + after + ta.value.slice(e)
  return { value: val, cursor: s + before.length + sel.length + after.length }
}

function prependLine(ta, prefix) {
  const s         = ta.selectionStart
  const lineStart = ta.value.lastIndexOf('\n', s - 1) + 1
  const hasIt     = ta.value.slice(lineStart).startsWith(prefix)
  const val = hasIt
    ? ta.value.slice(0, lineStart) + ta.value.slice(lineStart + prefix.length)
    : ta.value.slice(0, lineStart) + prefix + ta.value.slice(lineStart)
  return { value: val, cursor: s + (hasIt ? -prefix.length : prefix.length) }
}

// ── Component ─────────────────────────────────────────────────

export default function NoteEditor({ note, areaId, onBack }) {
  const { updateNote } = useLearning()
  const [title,   setTitle]   = useState(note?.title   ?? '')
  const [content, setContent] = useState(note?.content ?? '')
  // Start in preview if note already has content; new notes start in edit mode
  const [preview, setPreview] = useState(() => Boolean(note?.content?.trim()))
  const taRef           = useRef(null)
  const saveRef         = useRef(null)
  const mounted         = useRef(false)
  const pendingFmtRef   = useRef(null)

  // Auto-resize textarea
  function autoResize() {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.max(320, ta.scrollHeight) + 'px'
  }

  useEffect(() => { autoResize() }, [content, preview])

  // Debounced auto-save (skip on first mount)
  const doSave = useCallback((t, c) => {
    if (!mounted.current || !note?.id) return
    clearTimeout(saveRef.current)
    saveRef.current = setTimeout(() => {
      updateNote(areaId, note.id, { title: t.trim() || 'Untitled', content: c })
    }, 800)
  }, [areaId, note?.id, updateNote])

  useEffect(() => { mounted.current = true }, [])
  useEffect(() => () => clearTimeout(saveRef.current), [])

  // After switching from preview → edit, apply any queued format
  useEffect(() => {
    if (!preview && pendingFmtRef.current && taRef.current) {
      const type = pendingFmtRef.current
      pendingFmtRef.current = null
      const ta = taRef.current
      let result
      switch (type) {
        case 'bold':   result = insertAtCursor(ta, '**', '**', 'bold text'); break
        case 'italic': result = insertAtCursor(ta, '*',  '*',  'italic text'); break
        case 'h1':     result = prependLine(ta, '# '); break
        case 'h2':     result = prependLine(ta, '## '); break
        case 'code':   result = insertAtCursor(ta, '`', '`', 'code'); break
        case 'ul':     result = prependLine(ta, '- '); break
        case 'hr':     result = insertAtCursor(ta, '\n---\n', ''); break
        default: return
      }
      setContent(result.value)
      doSave(title, result.value)
      // Switch back to preview so the formatted result is visible immediately
      setPreview(true)
    }
  }, [preview]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleTitleChange(e) {
    setTitle(e.target.value)
    doSave(e.target.value, content)
  }

  function handleContentChange(e) {
    setContent(e.target.value)
    doSave(title, e.target.value)
    autoResize()
  }

  function handleBack() {
    clearTimeout(saveRef.current)
    if (note?.id) {
      updateNote(areaId, note.id, { title: title.trim() || 'Untitled', content })
    }
    onBack()
  }

  // Toolbar
  function applyFormat(type) {
    // If in preview mode, queue the format and switch to edit mode
    if (preview) {
      pendingFmtRef.current = type
      setPreview(false)
      return
    }
    const ta = taRef.current
    if (!ta) return
    let result
    switch (type) {
      case 'bold':   result = insertAtCursor(ta, '**', '**', 'bold text'); break
      case 'italic': result = insertAtCursor(ta, '*', '*', 'italic text'); break
      case 'h1':     result = prependLine(ta, '# '); break
      case 'h2':     result = prependLine(ta, '## '); break
      case 'code':   result = insertAtCursor(ta, '`', '`', 'code'); break
      case 'ul':     result = prependLine(ta, '- '); break
      case 'hr':     result = insertAtCursor(ta, '\n---\n', ''); break
      default: return
    }
    setContent(result.value)
    doSave(title, result.value)
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(result.cursor, result.cursor)
      autoResize()
    }, 0)
  }

  return (
    <div className="note-panel">

      {/* ── Top bar ── */}
      <div className="note-panel__topbar">
        <button className="btn-back" onClick={handleBack}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Notes
        </button>

        <div className="note-panel__toolbar">
          <button className="md-tool" onClick={() => applyFormat('bold')}   title="Bold"><b>B</b></button>
          <button className="md-tool md-tool--italic" onClick={() => applyFormat('italic')} title="Italic"><i>I</i></button>
          <div className="md-tool-sep" />
          <button className="md-tool" onClick={() => applyFormat('h1')}     title="Heading 1">H1</button>
          <button className="md-tool" onClick={() => applyFormat('h2')}     title="Heading 2">H2</button>
          <div className="md-tool-sep" />
          <button className="md-tool" onClick={() => applyFormat('ul')}     title="Bullet list">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="2" cy="4" r="1.2" fill="currentColor"/>
              <circle cx="2" cy="8" r="1.2" fill="currentColor"/>
              <circle cx="2" cy="12" r="1.2" fill="currentColor"/>
              <path d="M5 4h7M5 8h7M5 12h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
          <button className="md-tool" onClick={() => applyFormat('code')}   title="Inline code">&lt;/&gt;</button>
          <button className="md-tool" onClick={() => applyFormat('hr')}     title="Divider">—</button>
          <div className="md-tool-sep" />
          <button
            className={`md-tool md-tool--toggle${preview ? ' md-tool--active' : ''}`}
            onClick={() => setPreview(v => !v)}
            title={preview ? 'Switch to edit mode' : 'Switch to preview'}
          >
            {preview ? '✏ Edit' : '👁 Preview'}
          </button>
        </div>
      </div>

      {/* ── Title ── */}
      <input
        className="note-panel__title"
        value={title}
        onChange={handleTitleChange}
        placeholder="Untitled"
      />

      {/* ── Content: edit or preview ── */}
      {preview ? (
        <div
          className="note-panel__preview"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      ) : (
        <textarea
          ref={taRef}
          className="note-panel__textarea"
          value={content}
          onChange={handleContentChange}
          placeholder={'Start writing…\n\nSupports **bold**, *italic*, # Heading, - lists, `code`, ---'}
          onKeyDown={e => {
            if (e.key === 'Tab') {
              e.preventDefault()
              const ta  = e.target
              const s   = ta.selectionStart
              const val = content.slice(0, s) + '  ' + content.slice(ta.selectionEnd)
              setContent(val)
              setTimeout(() => ta.setSelectionRange(s + 2, s + 2), 0)
            }
          }}
        />
      )}

      <p className="note-panel__hint">Auto-saves as you type</p>
    </div>
  )
}
