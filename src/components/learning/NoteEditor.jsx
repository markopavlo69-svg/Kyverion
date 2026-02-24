import { useRef, useState } from 'react'

const MAX_IMAGE_SIZE = 600 * 1024 // 600KB per image

export default function NoteEditor({ note, onSave, onClose }) {
  const [title,   setTitle]   = useState(note?.title   ?? '')
  const [content, setContent] = useState(note?.content ?? '')
  const [images,  setImages]  = useState(note?.images  ?? [])
  const [imgError, setImgError] = useState('')
  const fileRef = useRef(null)

  function handleImageUpload(e) {
    setImgError('')
    const files = Array.from(e.target.files)
    const newImages = []

    files.forEach(file => {
      if (file.size > MAX_IMAGE_SIZE) {
        setImgError(`"${file.name}" is too large (max 600 KB).`)
        return
      }
      const reader = new FileReader()
      reader.onload = ev => {
        newImages.push({ id: `img_${Date.now()}_${Math.random().toString(36).slice(2)}`, data: ev.target.result, name: file.name })
        if (newImages.length === files.filter(f => f.size <= MAX_IMAGE_SIZE).length) {
          setImages(prev => [...prev, ...newImages])
        }
      }
      reader.readAsDataURL(file)
    })

    e.target.value = ''
  }

  function removeImage(id) {
    setImages(prev => prev.filter(img => img.id !== id))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    onSave({ title: title.trim(), content, images })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box modal-box--wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{note ? 'Edit Note' : 'New Note'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="note-editor-form">
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              className="form-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Note title…"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Content</label>
            <textarea
              className="form-textarea"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write your notes here…"
              rows={10}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Images</label>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => fileRef.current?.click()}
            >
              + Add Images
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />
            {imgError && <p className="form-error">{imgError}</p>}
            {images.length > 0 && (
              <div className="note-images-preview">
                {images.map(img => (
                  <div key={img.id} className="note-image-thumb">
                    <img src={img.data} alt={img.name} />
                    <button
                      type="button"
                      className="note-image-remove"
                      onClick={() => removeImage(img.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={!title.trim()}>
              {note ? 'Save Changes' : 'Add Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
