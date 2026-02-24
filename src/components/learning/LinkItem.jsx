export default function LinkItem({ link, onDelete }) {
  const hostname = (() => {
    try { return new URL(link.url).hostname.replace('www.', '') }
    catch { return link.url }
  })()

  return (
    <div className="link-item">
      <div className="link-item__icon">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5.5 7a3 3 0 004.3.3l1.5-1.5a3 3 0 00-4.2-4.2L6 2.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          <path d="M8.5 7a3 3 0 00-4.3-.3L2.7 8.2a3 3 0 004.2 4.2l1.1-1.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </div>
      <div className="link-item__body">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="link-item__title"
        >
          {link.title}
        </a>
        <span className="link-item__host">{hostname}</span>
      </div>
      <button
        className="icon-btn icon-btn--danger"
        onClick={() => onDelete(link.id)}
        title="Remove link"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 4h10M5 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M3 4l.8 7.5A.5.5 0 004.3 12h5.4a.5.5 0 00.5-.5L11 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )
}
