import type { ReactNode } from 'react'
import type { AccessoryType, PieceKind } from '../types'

export type IconName = Exclude<PieceKind, 'accessory'> | AccessoryType | 'box' | 'sliding'

// Each part is drawn filled inside a faint carcass outline, so a glance shows
// where in the unit it goes. 24 × 24, the carcass at x 4–20, y 3–21.
const ICONS: Record<IconName, ReactNode> = {
  box: (
    <>
      <rect className="on-light" x="4" y="3" width="16" height="18" />
      <path className="on-line" d="M4 3h16v18H4z M6.5 5.5h11v13h-11z" fillRule="evenodd" />
    </>
  ),
  vertical: <rect className="on" x="4" y="3" width="2.5" height="18" />,
  horizontal: (
    <>
      <rect className="on" x="4" y="3" width="16" height="2.5" />
      <rect className="on" x="4" y="18.5" width="16" height="2.5" />
    </>
  ),
  back: <rect className="on-light" x="4" y="3" width="16" height="18" />,
  plinth: <rect className="on" x="5.5" y="18" width="13" height="3" />,
  rail: <rect className="on" x="4" y="5.5" width="16" height="2" />,
  shelf: <rect className="on" x="4" y="11" width="16" height="2" />,
  divider: <rect className="on" x="11" y="3" width="2" height="18" />,
  rod: (
    <>
      <path className="on-line" d="M5 7.5h14" strokeWidth="1.6" fill="none" />
      <path className="on-line" d="M12 7.5v2 M8.5 13l3.5-3.5 3.5 3.5z" strokeWidth="1.2" fill="none" />
    </>
  ),
  drawer: (
    <>
      <rect className="on" x="5" y="12" width="14" height="7" />
      <path className="on-cut" d="M10 15.5h4" strokeWidth="1.4" />
    </>
  ),
  door: (
    <>
      <rect className="on" x="4" y="3" width="16" height="18" />
      <circle className="on-cut-fill" cx="16.5" cy="12" r="1" />
    </>
  ),
  sliding: (
    <>
      <rect className="on-light" x="4" y="3" width="9.5" height="18" />
      <rect className="on" x="10.5" y="3" width="9.5" height="18" />
    </>
  ),
  cornice: <rect className="on" x="2.5" y="1" width="19" height="3" />,
  filler: <rect className="on" x="20" y="3" width="2.5" height="18" />,
  trouser: (
    <>
      <rect className="on" x="5" y="9" width="14" height="1.6" />
      <path className="on-line" d="M7 10.5v6 M9.5 10.5v6 M12 10.5v6 M14.5 10.5v6 M17 10.5v6" strokeWidth="1.1" fill="none" />
    </>
  ),
  tie: (
    <>
      <rect className="on" x="5" y="8" width="14" height="1.6" />
      <path className="on-line" d="M7.5 9.5v3 M10.5 9.5v5 M13.5 9.5v3 M16.5 9.5v5" strokeWidth="1.1" fill="none" />
    </>
  ),
  basket: (
    <>
      <rect className="on-light" x="5" y="11" width="14" height="8" />
      <path className="on-line" d="M5 11h14v8H5z M8.5 11v8 M12 11v8 M15.5 11v8 M5 15h14" strokeWidth="0.9" fill="none" />
    </>
  ),
  'shoes-pullout': (
    <>
      <rect className="on" x="5" y="14" width="14" height="1.6" />
      <path className="on" d="M6.5 14v-2.5h2l2 1.5v1z M13 14v-2.5h2l2 1.5v1z" />
    </>
  ),
  'shoes-angled': (
    <>
      <path className="on" d="M4.5 17.5l15-4v1.8l-15 4z" />
      <path className="on" d="M7 16.2v-2.2h2l1.5 1.3z M13.5 14.5v-2.2h2l1.5 1.3z" />
    </>
  ),
}

/** A small picture of a part, for the add buttons. */
export function PartIcon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg className="part-icon" viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <rect className="carcass" x="4" y="3" width="16" height="18" />
      {ICONS[name]}
    </svg>
  )
}
