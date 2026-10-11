import type { ReactNode } from 'react'
import { useDialog } from './useDialog'

/**
 * A dialog over the dimmed page. Escape (see `useDialog`) or a click on the
 * dimmed page closes it. `label` names it for screen readers.
 */
export function Modal({
  label,
  className,
  onClose,
  children,
}: {
  label: string
  className?: string
  onClose: () => void
  children: ReactNode
}) {
  const dialog = useDialog<HTMLDivElement>(onClose)
  return (
    <div className="overlay" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={className ? `dialog ${className}` : 'dialog'} role="dialog" aria-modal="true" aria-label={label} ref={dialog}>
        {children}
      </div>
    </div>
  )
}

/** A dialog's title with a × to close it; `children` go between them (buttons). */
export function ModalHeader({
  title,
  closeLabel = 'Close',
  onClose,
  children,
}: {
  title: string
  closeLabel?: string
  onClose: () => void
  children?: ReactNode
}) {
  return (
    <header className="dialog-header">
      <h2>{title}</h2>
      {children}
      <button type="button" className="icon-button" aria-label={closeLabel} onClick={onClose}>
        ×
      </button>
    </header>
  )
}
