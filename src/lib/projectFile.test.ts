import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_THICKNESS } from './defaults'
import { FORMAT_VERSION, toProjectData } from './project'
import { downloadProject, readProjectFile } from './projectFile'

const file = (text: string, name = 'kitchen.json') => new File([text], name)
const project = (name?: string) =>
  ({ ...toProjectData({ pieces: [], thickness: DEFAULT_THICKNESS }, name), savedAt: '2026-09-29T10:00:00.000Z' })

describe('readProjectFile', () => {
  it('opens a saved project', async () => {
    const opened = await readProjectFile(file(JSON.stringify(project('Kitchen'))))
    expect(opened.name).toBe('Kitchen')
  })

  it('says why a file can’t be opened', async () => {
    await expect(readProjectFile(file('not json'))).rejects.toThrow("kitchen.json isn't a project file")
    const newer = { ...project(), formatVersion: FORMAT_VERSION + 1 }
    await expect(readProjectFile(file(JSON.stringify(newer)))).rejects.toThrow('newer version')
    await expect(readProjectFile(file('{"hello": 1}'))).rejects.toThrow("isn't a Boardcut project")
  })
})

describe('downloadProject', () => {
  afterEach(() => vi.unstubAllGlobals())

  const download = (data: ReturnType<typeof project>) => {
    const link = { href: '', download: '', click: vi.fn() }
    vi.stubGlobal('document', { createElement: () => link })
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} })
    vi.useFakeTimers()
    downloadProject(data)
    vi.useRealTimers()
    return link
  }

  it('names the file after the project, without characters file systems reject', () => {
    const link = download(project('Hall: left/right?'))
    expect(link.download).toBe('Hall  left right.json')
    expect(link.click).toHaveBeenCalledOnce()
  })

  it('falls back to a dated name', () => {
    expect(download(project()).download).toMatch(/^boardcut-2026-09-\d\d\.json$/)
  })
})
