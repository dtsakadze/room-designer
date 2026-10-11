import { type ReactNode, useState } from 'react'
import { useDialog } from './useDialog'
import { BoardSettings, ConstructionSettings, NewPartSettings, UnitSettings } from './BoardSettings'
import { HangingGuideSettings } from './HangingGuideSettings'
import { LookPicker } from './LookPicker'

export type SettingsPage = 'boards' | 'look' | 'construction' | 'new-parts' | 'preferences'

const PAGES: { id: SettingsPage; title: string; content: () => ReactNode }[] = [
  { id: 'boards', title: 'Boards', content: () => <BoardSettings /> },
  { id: 'look', title: 'Look', content: () => <LookPicker /> },
  { id: 'construction', title: 'Construction', content: () => <ConstructionSettings /> },
  { id: 'new-parts', title: 'New parts', content: () => <NewPartSettings /> },
  {
    id: 'preferences',
    title: 'This browser',
    content: () => (
      <>
        <p className="hint settings-page-intro">
          Your preferences in this browser, for every project. They aren&apos;t saved in projects.
        </p>
        <UnitSettings />
        <HangingGuideSettings />
      </>
    ),
  },
]

const PAGE_KEY = 'room-designer:settings-page'

function storedPage(): SettingsPage {
  try {
    const stored = localStorage.getItem(PAGE_KEY)
    if (PAGES.some((page) => page.id === stored)) return stored as SettingsPage
  } catch {
    // Blocked storage: start on the first page.
  }
  return 'boards'
}

/**
 * The project's settings and this browser's preferences, one page at a time.
 * They're set now and then rather than while designing, so they live here
 * instead of in the sidebar. Opens on the page last looked at, unless asked
 * for a particular one.
 */
export function SettingsDialog({ page: initialPage, onClose }: { page?: SettingsPage; onClose: () => void }) {
  const [page, setPage] = useState<SettingsPage>(() => initialPage ?? storedPage())

  const dialog = useDialog<HTMLDivElement>(onClose)

  const choose = (id: SettingsPage) => {
    setPage(id)
    try {
      localStorage.setItem(PAGE_KEY, id)
    } catch {
      // Remembered for this visit only.
    }
  }

  return (
    <div className="overlay" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="projects-panel settings-dialog" role="dialog" aria-modal="true" aria-label="Settings" ref={dialog}>
        <header className="projects-header">
          <h2>Settings</h2>
          <button type="button" className="icon-button" aria-label="Close settings" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="settings-layout">
          <nav className="settings-nav" aria-label="Settings pages">
            {PAGES.map(({ id, title }) => (
              <button
                key={id}
                type="button"
                className={id === 'preferences' ? 'settings-nav-browser' : undefined}
                aria-current={page === id ? 'page' : undefined}
                onClick={() => choose(id)}
              >
                {title}
              </button>
            ))}
          </nav>
          <div className="settings-page">{PAGES.find(({ id }) => id === page)!.content()}</div>
        </div>
      </div>
    </div>
  )
}
