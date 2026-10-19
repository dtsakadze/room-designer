import { type ReactNode, useState } from 'react'
import { Modal, ModalHeader } from './Modal'
import { BoardSettings, ConstructionSettings, NewPartSettings, UnitSettings } from './BoardSettings'
import { HangingGuideSettings } from './HangingGuideSettings'
import { LookPicker } from './LookPicker'
import { readPref, writePref } from '../lib/prefs'
import { driveAvailable } from '../lib/driveConfig'
import { DriveSettings } from './DriveSettings'

export type SettingsPage = 'boards' | 'look' | 'construction' | 'new-parts' | 'drive' | 'preferences'

const PAGES: { id: SettingsPage; title: string; content: () => ReactNode }[] = [
  { id: 'boards', title: 'Boards', content: () => <BoardSettings /> },
  { id: 'look', title: 'Look', content: () => <LookPicker /> },
  { id: 'construction', title: 'Construction', content: () => <ConstructionSettings /> },
  { id: 'new-parts', title: 'New parts', content: () => <NewPartSettings /> },
  // Only in builds that have a Google client id (see driveConfig.ts).
  ...(driveAvailable ? [{ id: 'drive' as const, title: 'Google Drive', content: () => <DriveSettings /> }] : []),
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
  const stored = readPref(PAGE_KEY)
  return PAGES.some((page) => page.id === stored) ? (stored as SettingsPage) : 'boards'
}

/**
 * The project's settings and this browser's preferences, one page at a time.
 * They're set now and then rather than while designing, so they live here
 * instead of in the sidebar. Opens on the page last looked at, unless asked
 * for a particular one.
 */
export function SettingsDialog({ page: initialPage, onClose }: { page?: SettingsPage; onClose: () => void }) {
  const [page, setPage] = useState<SettingsPage>(() => initialPage ?? storedPage())


  const choose = (id: SettingsPage) => {
    setPage(id)
    writePref(PAGE_KEY, id)
  }

  return (
    <Modal label="Settings" className="settings-dialog" onClose={onClose}>
      <ModalHeader title="Settings" closeLabel="Close settings" onClose={onClose} />
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
    </Modal>
  )
}
