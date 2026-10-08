import { describe, expect, it } from 'vitest'
import { BOARDS } from './defaults'
import { LOOKS } from './looks'
import { isHexColor } from './geometry'

describe('looks', () => {
  it('have unique ids and names, and only known boards with real colours', () => {
    expect(new Set(LOOKS.map((look) => look.id)).size).toBe(LOOKS.length)
    expect(new Set(LOOKS.map((look) => look.name)).size).toBe(LOOKS.length)
    const boards = BOARDS.map((board) => board.key)
    for (const look of LOOKS) {
      for (const colors of [look.boardColors, look.edgeColors]) {
        for (const [board, color] of Object.entries(colors)) {
          expect(boards).toContain(board)
          expect(isHexColor(color)).toBe(true)
        }
      }
      for (const board of look.grained) expect(boards).toContain(board)
      // Every board has a colour; the back panel is never banded.
      expect(Object.keys(look.boardColors).sort()).toEqual([...boards].sort())
      expect(look.edgeColors).not.toHaveProperty('back')
    }
  })

  it('has the looks asked for', () => {
    expect(LOOKS.map((look) => look.name)).toEqual([
      'Oak and white',
      'All white',
      'All black',
      'Walnut and grey',
      'Light oak, all over',
      'Grey melamine, oak fronts',
    ])
  })
})
