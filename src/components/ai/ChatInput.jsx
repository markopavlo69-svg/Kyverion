import { useRef, useState } from 'react'

export default function ChatInput({ onSend, disabled }) {
  const [text,         setText]         = useState('')
  const [imageDataUrl, setImageDataUrl] = useState(null)
  const fileInputRef  = useRef(null)
  const textareaRef   = useRef(null)

  const handleSend = () => {
    if ((!text.trim() && !imageDataUrl) || disabled) return
    onSend(text.trim(), imageDataUrl)
    setText('')
    setImageDataUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Auto-grow textarea
  const handleInput = (e) => {
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 96) + 'px' // max ~4 rows
    setText(el.value)
  }

  const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5 MB
  const ALLOWED_TYPES  = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      alert('Unsupported image format. Please use JPEG, PNG, GIF, or WebP.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      alert('Image is too large. Please use an image under 5 MB.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => setImageDataUrl(ev.target.result)
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImageDataUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const canSend = (text.trim() || imageDataUrl) && !disabled

  return (
    <div className="chat-input-wrap">
      {imageDataUrl && (
        <div className="chat-img-preview">
          <img src={imageDataUrl} alt="attachment" />
          <button className="chat-img-remove" onClick={removeImage} title="Remove image">
            ✕
          </button>
        </div>
      )}

      <div className="chat-input-row">
        <button
          className="chat-attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          title="Attach image"
          type="button"
        >
          📎
        </button>

        <textarea
          ref={textareaRef}
          className="chat-textarea"
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Waiting for response…' : 'Type a message… (Enter to send)'}
          disabled={disabled}
          rows={1}
        />

        <button
          className={`chat-send-btn ${canSend ? 'active' : ''}`}
          onClick={handleSend}
          disabled={!canSend}
          title="Send"
          type="button"
        >
          ↑
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImageSelect}
        />
      </div>
    </div>
  )
}
