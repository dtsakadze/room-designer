import { describe, expect, it } from 'vitest'
import type { Piece, PieceKind } from '../types'
import { CUT_LIST_SECTIONS, bandingTotals, cutList, describeHardware, hardwareList } from './cutList'
import { BOARD, DEFAULT_THICKNESS } from './defaults'
import { normalizePiece } from './geometry'

const thickness = DEFAULT_THICKNESS
let next = 0
const piece = (kind: PieceKind, rect: Partial<Piece> = {}): Piece =>
  normalizePiece(
    { id: `p${next++}`, kind, x: 0, y: 0, width: 500, height: 500, depth: 400, ...rect },
    thickness,
  )

describe('cut list', () => {
  it('has a section for every kind of board, so none is left out', () => {
    const inSections = CUT_LIST_SECTIONS.flatMap((section): readonly PieceKind[] => section.kinds)
    for (const kind of Object.keys(BOARD)) expect(inSections).toContain(kind)
  })

  it('groups boards into sections, parts of a kind together, biggest first', () => {
    const groups = cutList(
      [
        piece('shelf', { width: 400 }),
        piece('back', { width: 1200, height: 2000 }),
        piece('vertical', { height: 2000 }),
        piece('shelf', { width: 800, fixed: true }),
        piece('horizontal', { width: 1200 }),
        piece('door', { width: 600, height: 2000 }),
        piece('vertical', { height: 2000 }),
        piece('shelf', { width: 800 }),
        piece('rod'),
      ],
      thickness,
    )
    expect(
      groups.map((group) => [group.section, group.rows.map((row) => [row.label, row.quantity, row.length])]),
    ).toEqual([
      [
        'panels',
        [
          ['Side panel', 2, 2000],
          ['Top / bottom', 1, 1200],
          ['Back panel', 1, 2000],
        ],
      ],
      [
        'shelves',
        [
          ['Adjustable shelf', 1, 800],
          ['Adjustable shelf', 1, 400],
          ['Fixed shelf', 1, 800],
        ],
      ],
      ['doors', [['Door', 1, 2000]]],
    ])
  })

  it('lists a drawer’s boards in the order it’s put together', () => {
    const [group] = cutList([piece('drawer', { width: 564, height: 200, depth: 550 })], thickness)
    expect(group.rows.map((row) => row.label)).toEqual(['Front', 'Side', 'Back', 'Bottom'])
  })
})

describe('grain and edge banding', () => {
  const sizes = (rows: { length: number; width: number; grain: boolean }[]) =>
    rows.map((row) => [row.length, row.width, row.grain])

  it('gives the longer size as the length on a board without grain', () => {
    const [group] = cutList([piece('shelf', { width: 300, depth: 500 })], thickness)
    expect(sizes(group.rows)).toEqual([[500, 300, false]])
  })

  it('gives the size along the grain as the length on a board with grain', () => {
    // A shelf's grain runs left to right, even when it's deeper than it's wide.
    const shelf = piece('shelf', { width: 300, depth: 500 })
    expect(sizes(cutList([shelf], thickness, ['body'])[0].rows)).toEqual([[300, 500, true]])
    const turned = piece('shelf', { width: 300, depth: 500, grain: 'depth' })
    expect(sizes(cutList([turned], thickness, ['body'])[0].rows)).toEqual([[500, 300, true]])
    // Only the board with grain changes.
    expect(sizes(cutList([shelf], thickness, ['front'])[0].rows)).toEqual([[500, 300, false]])
  })

  it('turns a drawer front’s grain, and leaves its box alone', () => {
    const drawer = { width: 600, height: 200, depth: 550 }
    const rows = (patch = {}) =>
      cutList([piece('drawer', { ...drawer, ...patch })], thickness, ['front'])[0].rows
    expect(sizes(rows().slice(0, 1))).toEqual([[597, 197, true]])
    expect(sizes(rows({ grain: 'height' }).slice(0, 1))).toEqual([[197, 597, true]])
  })

  it('counts banded edges along the length and along the width', () => {
    const bands = (p: Piece, grained: ('body' | 'front')[] = []) =>
      cutList([p], thickness, grained)[0].rows[0].bands
    // A side panel's front edge runs up its height, its length.
    expect(bands(piece('vertical', { height: 2000, depth: 580 }))).toEqual({ length: 1, width: 0 })
    expect(bands(piece('back'))).toEqual({ length: 0, width: 0 })
    expect(bands(piece('door', { width: 600, height: 2000 }))).toEqual({ length: 2, width: 2 })
    // A deep shelf: its front edge is along the width once length means depth.
    const deep = piece('shelf', { width: 300, depth: 500 })
    expect(bands(deep)).toEqual({ length: 0, width: 1 })
    expect(bands(deep, ['body'])).toEqual({ length: 1, width: 0 })
  })

  it('lists parts banded differently on rows of their own', () => {
    const rows = cutList(
      [piece('shelf', { width: 800 }), piece('shelf', { width: 800 }), piece('shelf', { width: 800, bands: ['front', 'back'] })],
      thickness,
    )[0].rows
    expect(rows.map((row) => [row.quantity, row.bands])).toEqual([
      [2, { length: 1, width: 0 }],
      [1, { length: 2, width: 0 }],
    ])
  })

  it('adds up the banding each board needs', () => {
    const groups = cutList(
      [
        piece('shelf', { width: 800 }),
        piece('shelf', { width: 800 }),
        piece('back'),
        piece('door', { width: 600, height: 2000 }),
      ],
      thickness,
    )
    expect(bandingTotals(groups)).toEqual([
      { board: 'body', length: 1600 },
      { board: 'front', length: 2 * 2000 + 2 * 600 },
    ])
    expect(bandingTotals(cutList([piece('back')], thickness))).toEqual([])
  })
})

describe('hardware list', () => {
  it('lists hanging rods by diameter and length, with two end supports each', () => {
    const rods = [
      piece('rod', { width: 1164, height: 25 }),
      piece('rod', { width: 1164, height: 25 }),
      piece('rod', { width: 564, height: 25 }),
      piece('rod', { width: 564, height: 32 }),
    ]
    expect(hardwareList(rods, thickness)).toEqual([
      { item: 'rod', diameter: 25, length: 1164, quantity: 2 },
      { item: 'rod', diameter: 25, length: 564, quantity: 1 },
      { item: 'rod', diameter: 32, length: 564, quantity: 1 },
      { item: 'rod-supports', diameter: 25, quantity: 6 },
      { item: 'rod-supports', diameter: 32, quantity: 2 },
    ])
  })

  it('adds centre supports to a rod too long to span unsupported', () => {
    const list = hardwareList([piece('rod', { width: 1500, height: 25 }), piece('rod', { width: 2500, height: 25 })], thickness)
    expect(list.filter((row) => row.item === 'rod-centre-supports')).toEqual([
      { item: 'rod-centre-supports', diameter: 25, quantity: 3 },
    ])
    expect(list.map((row) => row.item)).toEqual(['rod', 'rod', 'rod-supports', 'rod-centre-supports'])
    expect(describeHardware(list[3], (mm) => `${mm}`).name).toBe('Rod centre support brackets, ⌀25')
  })

  it('puts drawer runners first, then rods', () => {
    const list = hardwareList(
      [piece('rod', { width: 1164, height: 25 }), piece('drawer', { width: 564, height: 200, depth: 550 })],
      thickness,
    )
    expect(list.map((row) => row.item)).toEqual(['runners', 'rod', 'rod-supports', 'handles'])
  })

  it('counts hinges by kind, after runners', () => {
    const list = hardwareList(
      [
        piece('door', { width: 600, height: 2000 }),
        piece('door', { x: 1000, width: 600, height: 700, softClose: true }),
        piece('door', { x: 2000, width: 600, height: 700, softClose: true, inset: true }),
        piece('drawer', { x: 3000, width: 564, height: 200, depth: 550 }),
      ],
      thickness,
    )
    expect(list.map((row) => row.item)).toEqual(['runners', 'hinges', 'hinges', 'hinges', 'handles'])
    expect(list.slice(1, 4)).toEqual([
      { item: 'hinges', fit: 'full', angle: 110, softClose: false, quantity: 4 },
      { item: 'hinges', fit: 'full', angle: 110, softClose: true, quantity: 2 },
      { item: 'hinges', fit: 'inset', angle: 110, softClose: true, quantity: 2 },
    ])
  })

  it('counts four pins per adjustable shelf and four screws per fixed one', () => {
    const list = hardwareList(
      [piece('shelf'), piece('shelf'), piece('shelf', { fixed: true }), piece('rod', { width: 564 })],
      thickness,
    )
    expect(list.slice(-2)).toEqual([
      { item: 'shelf-pins', quantity: 8 },
      { item: 'shelf-screws', quantity: 4 },
    ])
  })

  it('leaves rods out of the boards', () => {
    expect(cutList([piece('rod', { width: 1164, height: 25 })], thickness)).toEqual([])
  })
})

describe('hardware by joint type', () => {
  const box: Piece[] = [
    piece('vertical', { x: 0, width: 18, height: 700, depth: 580 }),
    piece('vertical', { x: 582, width: 18, height: 700, depth: 580 }),
    piece('horizontal', { x: 18, y: 0, width: 564, height: 18, depth: 580 }),
  ]

  it('lists screws, confirmat screws or cam locks, bolts and dowels, never a mix', () => {
    const items = (joints?: 'screws' | 'confirmat' | 'cam') =>
      hardwareList(box, thickness, joints).map((row) => row.item)
    expect(items()).toEqual(['carcass-screws'])
    expect(items('confirmat')).toEqual(['confirmat-screws'])
    expect(items('cam')).toEqual(['cam-locks', 'cam-bolts', 'dowels'])
  })
})

describe('anti-tip hardware', () => {
  it('lists brackets and one wall anchor for each, only for tall units', () => {
    const unit = (height: number): Piece[] => [
      piece('vertical', { x: 0, width: 18, height, depth: 580 }),
      piece('vertical', { x: 582, width: 18, height, depth: 580 }),
      piece('horizontal', { x: 18, y: height - 18, width: 564, height: 18, depth: 580 }),
    ]
    const rows = (pieces: Piece[]) =>
      hardwareList(pieces, thickness).filter((row) => row.item === 'anti-tip-brackets' || row.item === 'wall-anchors')
    expect(rows(unit(2000))).toEqual([
      { item: 'anti-tip-brackets', quantity: 2 },
      { item: 'wall-anchors', quantity: 2 },
    ])
    expect(rows(unit(600))).toEqual([])
  })
})

describe('hardware for handles', () => {
  it('lists each kind separately, with J-profile by length, grouped when equal', () => {
    const list = hardwareList(
      [
        piece('door', { width: 600, height: 2000, handle: 'profile' }),
        piece('door', { width: 600, height: 2000, handle: 'profile' }),
        piece('door', { width: 450, height: 2000, handle: 'profile' }),
        piece('door', { width: 600, height: 2000, handle: 'bar' }),
        piece('door', { width: 600, height: 2000, handle: 'push' }),
      ],
      thickness,
    )
    expect(list.filter((row) => ['bar-handles', 'push-latches', 'j-profile'].includes(row.item))).toEqual([
      { item: 'bar-handles', quantity: 1 },
      { item: 'j-profile', length: 600, quantity: 2 },
      { item: 'j-profile', length: 450, quantity: 1 },
      { item: 'push-latches', quantity: 1 },
    ])
    expect(describeHardware({ item: 'j-profile', length: 600, quantity: 2 }, (mm) => `${mm}`).name).toBe(
      'J-profile grip, 600 long',
    )
  })
})

describe('adjustable feet in the hardware list', () => {
  it('lists feet by height, grouped, and only for units off the floor', () => {
    const unit = (y: number, x = 0): Piece[] => [
      piece('vertical', { x, y, width: 18, height: 2000, depth: 580 }),
      piece('vertical', { x: x + 582, y, width: 18, height: 2000, depth: 580 }),
      piece('horizontal', { x: x + 18, y, width: 564, height: 18, depth: 580 }),
    ]
    const feet = (pieces: Piece[]) => hardwareList(pieces, thickness).filter((row) => row.item === 'feet')
    expect(feet([...unit(100), ...unit(100, 700)])).toEqual([{ item: 'feet', height: 100, quantity: 8 }])
    expect(feet(unit(0))).toEqual([])
    const [row] = feet(unit(100))
    expect(describeHardware(row, (mm) => `${mm}`).name).toBe('Adjustable feet, 100 high')
  })
})
