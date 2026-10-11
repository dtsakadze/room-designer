import { useEffect, useRef } from 'react'

/** Open dialogs and panels, newest last: only the newest answers Escape. */
const open: object[] = []

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Escape and focus for a dialog; put the returned ref on the element with
 * `role="dialog"`. Escape closes only the newest open one, so Print opened
 * over Settings closes alone, and a field that uses Escape itself (renaming)
 * keeps it by calling `preventDefault`. A modal dialog also takes focus when
 * it opens (unless something in it has `autoFocus`), keeps Tab inside it, so
 * keys can't reach the drawing behind, and gives focus back on closing.
 * Panels beside the drawing (the cut list, shortcuts) pass `modal: false`.
 */
export function useDialog<T extends HTMLElement>(onClose: () => void, { modal = true } = {}) {
  const ref = useRef<T>(null)
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })

  useEffect(() => {
    const token = {}
    open.push(token)
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = ref.current
    const focusable = () => [...(dialog?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
    if (modal && dialog && !dialog.contains(document.activeElement)) {
      const first = focusable()[0]
      if (first) first.focus()
      else {
        dialog.tabIndex = -1
        dialog.focus()
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (open.at(-1) !== token) return
      if (event.key === 'Escape') {
        if (event.defaultPrevented) return
        event.preventDefault()
        close.current()
      } else if (event.key === 'Tab' && modal && dialog) {
        const items = focusable()
        if (items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        const inside = dialog.contains(document.activeElement)
        if (event.shiftKey && (!inside || document.activeElement === first)) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && (!inside || document.activeElement === last)) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      open.splice(open.indexOf(token), 1)
      if (modal && previous?.isConnected && previous !== document.body) previous.focus()
    }
  }, [modal])

  return ref
}
