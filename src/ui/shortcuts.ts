export const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/** ⌘ on a Mac, Ctrl elsewhere. */
export const hasModifier = (event: KeyboardEvent) => (IS_MAC ? event.metaKey : event.ctrlKey)

/** Shortcut labels for buttons and hints, in the platform's own notation. */
export const UNDO_SHORTCUT = IS_MAC ? '⌘Z' : 'Ctrl+Z'
export const REDO_SHORTCUT = IS_MAC ? '⇧⌘Z' : 'Ctrl+Shift+Z'
export const DUPLICATE_SHORTCUT = IS_MAC ? '⌘D' : 'Ctrl+D'
/** Mac keyboards label Backspace "delete", and both keys remove a part. */
export const DELETE_SHORTCUT = IS_MAC ? '⌫' : 'Del'
