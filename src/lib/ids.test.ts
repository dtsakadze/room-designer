import { describe, expect, it } from 'vitest'
import { newId } from './ids'

describe('newId', () => {
  it('gives a different id each time', () => {
    const ids = new Set(Array.from({ length: 100 }, newId))
    expect(ids.size).toBe(100)
  })
})
