import { useState } from 'react'

const DISMISSED_KEY = 'room-designer:rotate-hint-dismissed'

function dismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) === 'yes'
  } catch {
    return false
  }
}

/**
 * On a phone held upright, suggests turning it sideways, where the drawing
 * gets more room. Only a suggestion: everything works upright too. The CSS
 * shows it only on a narrow, upright screen; once closed it stays closed.
 */
export function RotateHint() {
  const [hidden, setHidden] = useState(dismissed)
  if (hidden) return null

  const close = () => {
    setHidden(true)
    try {
      localStorage.setItem(DISMISSED_KEY, 'yes')
    } catch {
      // Shows again next visit, which is harmless.
    }
  }

  return (
    <div className="rotate-hint" role="status">
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
        <rect x="7" y="3" width="10" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 14a9 9 0 0 0 6 7 M3 14l-1 3 M3 14l3 1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span>Turn your phone sideways for more room to draw.</span>
      <button type="button" className="icon-button" aria-label="Close" onClick={close}>
        ×
      </button>
    </div>
  )
}
