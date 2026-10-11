export const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/** ⌘ on a Mac, Ctrl elsewhere. */
export const hasModifier = (event: { metaKey: boolean; ctrlKey: boolean }) =>
  IS_MAC ? event.metaKey : event.ctrlKey

const FIELD_TAGS = ['INPUT', 'TEXTAREA', 'SELECT']

/**
 * Whether a key press belongs to a form field: typing, or picking in a
 * dropdown, where Backspace and the arrows mean something else than deleting
 * or nudging the selected part.
 */
export function isFieldTarget(target: EventTarget | null) {
  const element = target as { tagName?: string; isContentEditable?: boolean } | null
  return !!element && (FIELD_TAGS.includes(element.tagName ?? '') || element.isContentEditable === true)
}

/**
 * Whether a dialog, a full view (the cut list) or a menu is open over the
 * drawing, so keys that edit the design leave it alone: the parts they'd act
 * on are hidden behind it. The Shortcuts panel doesn't count, as it sits
 * beside the drawing for trying them out.
 */
export const isOverlayOpen = () =>
  document.querySelector('[role="dialog"]:not(.shortcuts-panel), [role="menu"]') !== null

/** Whether an open dialog or menu, the Shortcuts panel included, takes Escape to close itself. */
export const escapeOwnedByOverlay = () => document.querySelector('[role="dialog"], [role="menu"]') !== null

/** Shortcut labels for buttons and hints, in the platform's own notation. */
export const UNDO_SHORTCUT = IS_MAC ? '⌘Z' : 'Ctrl+Z'
export const REDO_SHORTCUT = IS_MAC ? '⇧⌘Z' : 'Ctrl+Shift+Z'
export const DUPLICATE_SHORTCUT = IS_MAC ? '⌘D' : 'Ctrl+D'
/** Mac keyboards label Backspace "delete", and both keys remove a part. */
export const DELETE_SHORTCUT = IS_MAC ? '⌫' : 'Del'
export const SELECT_ALL_SHORTCUT = IS_MAC ? '⌘A' : 'Ctrl+A'
export const COPY_SHORTCUT = IS_MAC ? '⌘C' : 'Ctrl+C'
export const PASTE_SHORTCUT = IS_MAC ? '⌘V' : 'Ctrl+V'
export const PRINT_SHORTCUT = IS_MAC ? '⌘P' : 'Ctrl+P'
export const MEASURE_SHORTCUT = 'M'
/** Held while clicking a part to add it to (or take it out of) the selection. */
export const MULTI_SELECT_KEY = IS_MAC ? '⌘' : 'Ctrl'

/** Fired on the window to open the print dialog from outside the sidebar, which owns it. */
export const PRINT_EVENT = 'room-designer:print'
