import { useEffect, useState } from 'react'
import changelog from '../../CHANGELOG.md?raw'
import { parseChangelog } from '../lib/changelog'

const RELEASES = parseChangelog(changelog)
const SEEN_KEY = 'room-designer:seen-version'

/** The version this browser last showed, or null on a first visit. */
function seenVersion() {
  try {
    return localStorage.getItem(SEEN_KEY)
  } catch {
    return null
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, __APP_VERSION__)
  } catch {
    // Blocked storage: the notice may show again next visit, which is harmless.
  }
}

/**
 * The app's version, with a "What's new" panel from CHANGELOG.md. After an
 * update it shows a one-time "Updated to …" notice; on a first visit it
 * doesn't, since there's nothing to compare against.
 */
export function VersionInfo() {
  const [open, setOpen] = useState(false)
  const [updated, setUpdated] = useState(() => {
    const seen = seenVersion()
    return seen !== null && seen !== __APP_VERSION__
  })

  useEffect(() => {
    if (seenVersion() === null) markSeen()
  }, [])

  const dismiss = () => {
    markSeen()
    setUpdated(false)
  }

  return (
    <>
      {updated && (
        <div className="update-notice" role="status">
          <span>Updated to v{__APP_VERSION__}.</span>
          <button
            type="button"
            className="link-button"
            onClick={() => {
              dismiss()
              setOpen(true)
            }}
          >
            See what's new
          </button>
          <button type="button" className="icon-button" aria-label="Dismiss" onClick={dismiss}>
            ×
          </button>
        </div>
      )}
      <p className="version-line">
        v{__APP_VERSION__} ·{' '}
        <button type="button" className="link-button" onClick={() => setOpen(true)}>
          What's new
        </button>
      </p>
      {open && <WhatsNewPanel onClose={() => setOpen(false)} />}
    </>
  )
}

function WhatsNewPanel({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="overlay"
      onPointerDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="projects-panel whats-new" role="dialog" aria-label="What's new">
        <header className="projects-header">
          <h2>What's new</h2>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="whats-new-body">
          {RELEASES.map((release) => (
            <section key={release.version}>
              <h3>
                v{release.version}
                {release.version === __APP_VERSION__ && (
                  <span className="muted"> · this version</span>
                )}
                <span className="muted"> · {release.date}</span>
              </h3>
              {release.summary && <p className="muted">{release.summary}</p>}
              <ul>
                {release.changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
