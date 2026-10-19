import { describe, expect, it } from 'vitest'
import { AuthError, DriveError, driveClient } from './drive'

type Call = { url: string; init: RequestInit }

/** A Drive that answers with the given responses in order, and keeps what it was asked. */
function fakeDrive(...responses: (object | number)[]) {
  const calls: Call[] = []
  const fetcher = (async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    const next = responses.shift()
    if (typeof next === 'number') return new Response('', { status: next })
    return new Response(JSON.stringify(next ?? {}), { status: 200 })
  }) as unknown as typeof fetch
  return { calls, client: driveClient(async () => 'token', fetcher) }
}

const decoded = (url: string) => decodeURIComponent(url.replace(/\+/g, ' '))

describe('driveClient', () => {
  it('signs every request with the token', async () => {
    const { client, calls } = fakeDrive({ files: [] })
    await client.findFolder('Boardcut', null)
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer token')
  })

  it('looks for a folder by name inside its parent, My Drive being root, with quotes escaped', async () => {
    const { client, calls } = fakeDrive({ files: [{ id: 'f1', name: "Dad's" }] }, { files: [] })
    expect(await client.findFolder("Dad's", 'parent')).toBe('f1')
    expect(await client.findFolder('Boardcut', null)).toBeNull()
    expect(decoded(calls[0].url)).toContain("name='Dad\\'s' and 'parent' in parents and trashed=false")
    expect(decoded(calls[1].url)).toContain("'root' in parents")
  })

  it('makes a folder in its parent', async () => {
    const { client, calls } = fakeDrive({ id: 'new' })
    expect(await client.createFolder('Boardcut', 'parent')).toBe('new')
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      name: 'Boardcut',
      mimeType: 'application/vnd.google-apps.folder',
      parents: ['parent'],
    })
  })

  it('lists project files across pages, leaving out files that are not projects', async () => {
    const { client, calls } = fakeDrive(
      { files: [{ id: 'a', name: 'A.json', modifiedTime: 't1', appProperties: { projectId: 'p1' } }], nextPageToken: 'more' },
      { files: [{ id: 'b', name: 'notes.txt', modifiedTime: 't2' }, { id: 'c', name: 'C.json', modifiedTime: 't3', appProperties: { projectId: 'p3' } }] },
    )
    expect(await client.listProjects('folder')).toEqual([
      { id: 'a', name: 'A.json', modifiedTime: 't1', projectId: 'p1' },
      { id: 'c', name: 'C.json', modifiedTime: 't3', projectId: 'p3' },
    ])
    expect(calls[1].url).toContain('pageToken=more')
  })

  it('treats a missing or trashed file as gone', async () => {
    const { client } = fakeDrive(404, { id: 'x', trashed: true }, { id: 'y', name: 'Y.json', modifiedTime: 't', appProperties: { projectId: 'p' } })
    expect(await client.getFile('gone')).toBeNull()
    expect(await client.getFile('x')).toBeNull()
    expect(await client.getFile('y')).toEqual({ id: 'y', name: 'Y.json', modifiedTime: 't', projectId: 'p' })
  })

  it('creates a file with its details and content in one request, tagged with its project', async () => {
    const { client, calls } = fakeDrive({ id: 'n', name: 'Wardrobe.json', modifiedTime: 't', appProperties: { projectId: 'p1' } })
    const file = await client.create('folder', 'Wardrobe.json', 'p1', { pieces: [] })
    expect(file.projectId).toBe('p1')
    const [{ url, init }] = calls
    expect(url).toContain('/upload/drive/v3/files?uploadType=multipart')
    expect(init.method).toBe('POST')
    const body = init.body as string
    expect(body).toContain('"parents":["folder"]')
    expect(body).toContain('"appProperties":{"projectId":"p1"}')
    expect(body).toContain('{"pieces":[]}')
  })

  it('updates a file in place and trashes one without caring that it is already gone', async () => {
    const { client, calls } = fakeDrive({ id: 'n', name: 'B.json', modifiedTime: 't2' }, 404)
    expect((await client.update('n', 'B.json', { a: 1 })).modifiedTime).toBe('t2')
    expect(calls[0].init.method).toBe('PATCH')
    expect(calls[0].url).toContain('/upload/drive/v3/files/n')
    await expect(client.trash('n')).resolves.toBeUndefined()
    expect(JSON.parse(calls[1].init.body as string)).toEqual({ trashed: true })
  })

  it('reads a file’s JSON', async () => {
    const { client, calls } = fakeDrive({ formatVersion: 19 })
    expect(await client.read('n')).toEqual({ formatVersion: 19 })
    expect(calls[0].url).toContain('alt=media')
  })

  it('turns a refused sign-in into AuthError, other failures into DriveError, and no connection into status 0', async () => {
    await expect(fakeDrive(401).client.listProjects('f')).rejects.toBeInstanceOf(AuthError)
    await expect(fakeDrive(403).client.listProjects('f')).rejects.toBeInstanceOf(AuthError)
    await expect(fakeDrive(500).client.listProjects('f')).rejects.toMatchObject({ status: 500 })
    const offline = driveClient(async () => 't', (async () => { throw new TypeError('offline') }) as unknown as typeof fetch)
    await expect(offline.listProjects('f')).rejects.toEqual(expect.objectContaining({ status: 0 }))
    await expect(offline.listProjects('f')).rejects.toBeInstanceOf(DriveError)
  })
})
