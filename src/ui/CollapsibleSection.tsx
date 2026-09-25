import { type ReactNode, useState } from 'react'

type CollapsibleSectionProps = {
  /** Remembers whether it's open, per section, in this browser. */
  id: string
  title: string
  defaultOpen?: boolean
  /** Shown next to the title, so it's visible while folded (e.g. a count). */
  badge?: ReactNode
  /** Flags a problem inside (e.g. overlapping parts), visible while folded. */
  alert?: string
  children: ReactNode
}

const storageKey = (id: string) => `room-designer:section:${id}`

function storedOpen(id: string, fallback: boolean) {
  try {
    const stored = localStorage.getItem(storageKey(id))
    if (stored === 'open') return true
    if (stored === 'closed') return false
  } catch {
    // Blocked storage: use the default.
  }
  return fallback
}

/** A sidebar section that folds open and shut. New sections are just new ones of these. */
export function CollapsibleSection({
  id,
  title,
  defaultOpen = false,
  badge,
  alert,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(() => storedOpen(id, defaultOpen))

  const toggle = () => {
    setOpen(!open)
    try {
      localStorage.setItem(storageKey(id), open ? 'closed' : 'open')
    } catch {
      // Still toggles for this visit.
    }
  }

  return (
    <section className="collapsible">
      <button
        type="button"
        className="collapsible-header"
        aria-expanded={open}
        aria-controls={`section-${id}`}
        onClick={toggle}
      >
        <svg className="collapsible-chevron" viewBox="0 0 10 10" aria-hidden>
          <path d="M3 2 L7 5 L3 8" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        <span className="collapsible-title">{title}</span>
        {badge !== undefined && <span className="collapsible-badge">{badge}</span>}
        {alert && <span className="collapsible-alert" title={alert} aria-label={alert} />}
      </button>
      {open && (
        <div className="collapsible-body" id={`section-${id}`}>
          {children}
        </div>
      )}
    </section>
  )
}
