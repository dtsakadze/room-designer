export type PartKind = 'shelf' | 'divider' | 'rod' | 'drawer'

/**
 * A piece inside the cabinet. Position is the part's min corner within the
 * inner cavity, in mm, origin at the inner bottom-left-back corner.
 */
export type Part = {
  id: string
  kind: PartKind
  x: number
  y: number
  z: number
  width: number
  height: number
  depth: number
}

/** Outer dimensions in mm. */
export type Cabinet = {
  id: string
  width: number
  height: number
  depth: number
  thickness: number
  hasBack: boolean
  parts: Part[]
}

export const CABINET_ID = 'cabinet'
