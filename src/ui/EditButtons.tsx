import { useEffect } from 'react'
import { onClipboardChange } from '../lib/clipboard'
import { useDesignStore } from '../store/useDesignStore'
import { useLayoutStore } from '../store/useLayoutStore'
import { COPY_SHORTCUT, PASTE_SHORTCUT, REDO_SHORTCUT, UNDO_SHORTCUT } from './shortcuts'

/** Undo / redo and copy / paste, with the keyboard shortcut shown on each button. */
export function EditButtons() {
  const canUndo = useDesignStore((s) => s.past.length > 0)
  const canRedo = useDesignStore((s) => s.future.length > 0)
  const canCopy = useDesignStore((s) => s.selectedIds.length > 0)
  const canPaste = useDesignStore((s) => s.canPaste)
  const { undo, redo, copySelection, paste, refreshClipboard } = useDesignStore.getState()

  // Another tab copying something makes Paste available here too.
  useEffect(() => onClipboardChange(refreshClipboard), [refreshClipboard])

  const buttons = [
    { label: 'Undo', shortcut: UNDO_SHORTCUT, onClick: undo, enabled: canUndo },
    { label: 'Redo', shortcut: REDO_SHORTCUT, onClick: redo, enabled: canRedo },
    { label: 'Copy', shortcut: COPY_SHORTCUT, onClick: copySelection, enabled: canCopy },
    { label: 'Paste', shortcut: PASTE_SHORTCUT, onClick: paste, enabled: canPaste },
  ]

  return (
    <div className="history-tools">
      {/* On a small screen the sidebar is a drawer, opened from here. */}
      <button
        type="button"
        className="ghost-button menu-button compact-only"
        aria-label="Open the sidebar"
        title="Project, room, add parts, parts list"
        onClick={() => useLayoutStore.getState().setSidebarOpen(true)}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <path d="M4 7h16 M4 12h16 M4 17h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      {buttons.map(({ label, shortcut, onClick, enabled }) => (
        <button
          key={label}
          type="button"
          className="ghost-button"
          onClick={onClick}
          disabled={!enabled}
          title={`${label} (${shortcut})`}
        >
          {label} <kbd>{shortcut}</kbd>
        </button>
      ))}
    </div>
  )
}
