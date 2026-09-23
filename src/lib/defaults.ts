import type { Cabinet, Part, PartKind } from '../types'
import { innerSize } from './geometry'

export const PANEL_THICKNESS = 18
export const ROD_DIAMETER = 25

export const defaultCabinet = (): Cabinet => ({
  id: 'cabinet',
  width: 1200,
  height: 2000,
  depth: 600,
  thickness: PANEL_THICKNESS,
  hasBack: true,
  parts: [],
})

export const PART_LABELS: Record<PartKind, string> = {
  shelf: 'Shelf',
  divider: 'Divider',
  rod: 'Hanging rod',
  drawer: 'Drawer',
}

/** A fresh part, sized to the cavity and placed somewhere visible. */
export function createPart(kind: PartKind, cabinet: Cabinet, id: string): Part {
  const inner = innerSize(cabinet)
  const base = { id, kind, x: 0, y: 0, z: 0 }

  switch (kind) {
    case 'shelf':
      return {
        ...base,
        width: inner.width,
        height: PANEL_THICKNESS,
        depth: inner.depth,
        y: Math.round(inner.height / 2),
      }
    case 'divider':
      return {
        ...base,
        width: PANEL_THICKNESS,
        height: inner.height,
        depth: inner.depth,
        x: Math.round((inner.width - PANEL_THICKNESS) / 2),
      }
    case 'rod':
      return {
        ...base,
        width: inner.width,
        height: ROD_DIAMETER,
        depth: ROD_DIAMETER,
        y: Math.round(inner.height * 0.75),
        z: Math.round((inner.depth - ROD_DIAMETER) / 2),
      }
    case 'drawer':
      return {
        ...base,
        width: inner.width,
        height: Math.min(200, inner.height),
        depth: Math.max(1, inner.depth - 30),
        y: 0,
      }
  }
}
