import { describe, expect, it } from 'vitest'
import { freeName } from './names'

describe('freeName', () => {
  it('keeps a free name and numbers a taken one from 2, skipping numbers in use', () => {
    expect(freeName('Unit', [])).toBe('Unit')
    expect(freeName('Unit', ['Unit'])).toBe('Unit 2')
    expect(freeName('Unit', ['Unit', 'Unit 2', 'Unit 3'])).toBe('Unit 4')
  })
})
