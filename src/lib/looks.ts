import type { BoardColors, BoardKey } from '../types'

/**
 * A look: the colours of the boards and their edge banding, and which boards
 * have a grain, to try in one click. It only sets what a project already
 * stores, so it isn't saved as a look.
 */
export type Look = {
  id: string
  name: string
  boardColors: BoardColors
  edgeColors: BoardColors
  grained: BoardKey[]
}

const WHITE = '#f4f4f0'
const OFF_WHITE = '#e9e9e4'
const OAK = '#c8a06a'
const LIGHT_OAK = '#d9b988'
const WALNUT = '#6b4a33'
const GREY = '#9aa0a6'
const LIGHT_GREY = '#c9ccd0'
const MELAMINE_GREY = '#b8bcc0'
const BLACK = '#2b2b2b'
const DEEP_BLACK = '#1c1c1c'

/** No colours and no grain: how a project starts, and what to go back to after trying a look. */
export const STANDARD_LOOK: Look = {
  id: 'standard',
  name: 'Standard',
  boardColors: {},
  edgeColors: {},
  grained: [],
}

export const LOOKS: Look[] = [
  {
    id: 'oak-white',
    name: 'Oak and white',
    boardColors: { body: WHITE, back: OFF_WHITE, front: OAK, drawer: WHITE },
    edgeColors: { body: WHITE, front: OAK, drawer: WHITE },
    grained: ['front'],
  },
  {
    id: 'all-white',
    name: 'All white',
    boardColors: { body: WHITE, back: OFF_WHITE, front: WHITE, drawer: WHITE },
    edgeColors: { body: WHITE, front: WHITE, drawer: WHITE },
    grained: [],
  },
  {
    id: 'all-black',
    name: 'All black',
    boardColors: { body: BLACK, back: DEEP_BLACK, front: BLACK, drawer: BLACK },
    edgeColors: { body: DEEP_BLACK, front: DEEP_BLACK, drawer: DEEP_BLACK },
    grained: [],
  },
  {
    id: 'walnut-grey',
    name: 'Walnut and grey',
    boardColors: { body: GREY, back: LIGHT_GREY, front: WALNUT, drawer: GREY },
    edgeColors: { body: GREY, front: WALNUT, drawer: GREY },
    grained: ['front'],
  },
  {
    id: 'light-oak',
    name: 'Light oak, all over',
    boardColors: { body: LIGHT_OAK, back: LIGHT_OAK, front: LIGHT_OAK, drawer: LIGHT_OAK },
    edgeColors: { body: LIGHT_OAK, front: LIGHT_OAK, drawer: LIGHT_OAK },
    grained: ['body', 'front', 'drawer'],
  },
  {
    id: 'grey-oak',
    name: 'Grey melamine, oak fronts',
    boardColors: { body: MELAMINE_GREY, back: LIGHT_GREY, front: OAK, drawer: MELAMINE_GREY },
    edgeColors: { body: MELAMINE_GREY, front: OAK, drawer: MELAMINE_GREY },
    grained: ['front'],
  },
]
