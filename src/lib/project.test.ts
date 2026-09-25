import { describe, expect, it } from 'vitest'
import { FORMAT_VERSION, readProject, toProjectData } from './project'

/**
 * Saved samples of every format version. `<name>.json` is a save as that
 * version wrote it; `<name>.expected.json` is what it opened into when it was
 * captured, so upgrades must keep opening it into exactly the same design.
 */
const fixtures = import.meta.glob<unknown>('./fixtures/*.json', { eager: true, import: 'default' })
const fixture = (name: string) => structuredClone(fixtures[`./fixtures/${name}.json`])
const samples = Object.keys(fixtures)
  .map((path) => path.replace('./fixtures/', '').replace('.json', ''))
  .filter((name) => !name.endsWith('.expected'))

const withoutVersion = (project: object) => {
  const { formatVersion: _version, ...rest } = project as { formatVersion: number }
  return rest
}

describe('readProject', () => {
  it.each(samples)('opens the %s sample', (name) => {
    const result = readProject(fixture(name))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.project.formatVersion).toBe(FORMAT_VERSION)
  })

  it.each(['v1-minimal', 'v1-full'])('opens %s into the same design as when it was saved', (name) => {
    const result = readProject(fixture(name))
    if (!result.ok) throw new Error(`${name} didn't open`)
    expect(withoutVersion(result.project)).toEqual(fixture(`${name}.expected`))
  })

  it('has a sample for every older version, so each upgrade step is tested', () => {
    for (let version = 1; version < FORMAT_VERSION; version++) {
      expect(samples.some((name) => name.startsWith(`v${version}-`))).toBe(true)
    }
    expect(samples.some((name) => name.startsWith(`v${FORMAT_VERSION}-`))).toBe(true)
  })

  it('fills in what older saves lacked', () => {
    const result = readProject(fixture('v1-minimal'))
    if (!result.ok) throw new Error("v1-minimal didn't open")
    expect(result.project.unitDepth).toBe(600)
    expect(result.project.boxes).toEqual([])
  })

  it('leaves the save it reads untouched', () => {
    const save = fixture('v1-full')
    const before = structuredClone(save)
    readProject(save)
    expect(save).toEqual(before)
  })

  it('reads back what it writes', () => {
    const first = readProject(fixture('v1-full'))
    if (!first.ok) throw new Error("v1-full didn't open")
    const saved = JSON.parse(JSON.stringify(toProjectData(first.project, first.project.name)))
    const second = readProject(saved)
    if (!second.ok) throw new Error("the re-saved project didn't open")
    expect(withoutVersion(second.project)).toEqual({
      ...withoutVersion(first.project),
      savedAt: second.project.savedAt,
    })
  })

  it('refuses a save from a newer version instead of guessing', () => {
    const save = { ...(fixture('v2-full') as object), formatVersion: FORMAT_VERSION + 1 }
    expect(readProject(save)).toEqual({ ok: false, problem: 'newer' })
  })

  it.each([
    ['nothing', null],
    ['a string', 'hello'],
    ['an unrelated object', { name: 'package' }],
    ['version 0', { formatVersion: 0, pieces: [] }],
    ['a text version', { formatVersion: '1', pieces: [] }],
    ['a fractional version', { formatVersion: 1.5, pieces: [] }],
    ['no parts list', { formatVersion: 1 }],
  ])('refuses %s as damaged', (_label, save) => {
    expect(readProject(save)).toEqual({ ok: false, problem: 'invalid' })
  })

  it('drops broken parts but keeps the rest', () => {
    const save = fixture('v1-minimal') as { pieces: unknown[] }
    save.pieces.push(null, { id: 'x', kind: 'spaceship' }, { id: 'y', kind: 'shelf', x: 'left' })
    const result = readProject(save)
    if (!result.ok) throw new Error("the damaged save didn't open")
    expect(result.project.pieces).toHaveLength(7)
  })
})
