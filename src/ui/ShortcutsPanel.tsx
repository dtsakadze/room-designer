import {
  COPY_SHORTCUT,
  DELETE_SHORTCUT,
  DUPLICATE_SHORTCUT,
  MULTI_SELECT_KEY,
  PASTE_SHORTCUT,
  REDO_SHORTCUT,
  SELECT_ALL_SHORTCUT,
  UNDO_SHORTCUT,
} from './shortcuts'

/** Every keyboard and mouse shortcut, in one place. */
const SHORTCUTS: [string, string][] = [
  [`${MULTI_SELECT_KEY}-click`, 'Add a part to the selection, or take it out'],
  [`${MULTI_SELECT_KEY}-drag`, 'Select every part the rectangle touches'],
  [SELECT_ALL_SHORTCUT, 'Select all parts'],
  ['Click a selected part', 'Select the part beneath it'],
  [COPY_SHORTCUT, 'Copy the selected parts'],
  [PASTE_SHORTCUT, 'Paste, in this project or another'],
  [DUPLICATE_SHORTCUT, 'Duplicate the selected part'],
  [DELETE_SHORTCUT, 'Delete the selected parts'],
  [UNDO_SHORTCUT, 'Undo'],
  [REDO_SHORTCUT, 'Redo'],
  ['← → ↑ ↓', 'Nudge the selected part 10 mm (Front view)'],
  ['⇧ + arrows', 'Nudge 100 mm'],
  ['Drag empty space', 'Pan (right-drag works too)'],
  ['Scroll', 'Zoom'],
  ['Esc', 'Close a dialog'],
]

export function ShortcutsPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="cut-list shortcuts-panel">
      <header className="cut-list-header">
        <h2>Keyboard shortcuts</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Close shortcuts"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <table>
        <tbody>
          {SHORTCUTS.map(([keys, action]) => (
            <tr key={keys}>
              <td>
                <kbd>{keys}</kbd>
              </td>
              <td>{action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
