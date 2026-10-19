/** A project's file in Drive, as the sync sees it. */
export type DriveFile = {
  id: string
  /** The file's name, which is the project's name plus `.json` (see `fileNameOf`). */
  name: string
  /** Drive's own clock, so it's compared with itself and never with ours. */
  modifiedTime: string
  /** The project this file holds (kept in the file's app properties), or null for a file that isn't one. */
  projectId: string | null
}

/** What the sync needs from Drive; `driveClient` is the real one, tests use their own. */
export type DriveClient = {
  /** A folder by name inside a folder (null: My Drive), or null when there is none. */
  findFolder: (name: string, parentId: string | null) => Promise<string | null>
  createFolder: (name: string, parentId: string | null) => Promise<string>
  /** Every project file in a folder, trashed ones left out. */
  listProjects: (folderId: string) => Promise<DriveFile[]>
  /** One file, or null when it's gone or in the trash. */
  getFile: (id: string) => Promise<DriveFile | null>
  /** A file's JSON. */
  read: (id: string) => Promise<unknown>
  create: (folderId: string, name: string, projectId: string, content: unknown) => Promise<DriveFile>
  update: (id: string, name: string, content: unknown) => Promise<DriveFile>
  /** Moves a file to the trash (Drive keeps it 30 days); a file that's gone is fine. */
  trash: (id: string) => Promise<void>
}

/** Drive refused or failed a request; `status` is the HTTP status (0: no connection). */
export class DriveError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'DriveError'
    this.status = status
  }
}

/** The sign-in has run out or was refused: the person has to connect again. */
export class AuthError extends Error {
  constructor(message = 'Sign in to Google again') {
    super(message)
    this.name = 'AuthError'
  }
}

const FILES = 'https://www.googleapis.com/drive/v3/files'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files'
const FOLDER_TYPE = 'application/vnd.google-apps.folder'
const FIELDS = 'id,name,modifiedTime,trashed,appProperties'

/** A value inside a quoted Drive search term. */
const quote = (value: string) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

type Raw = {
  id?: string
  name?: string
  modifiedTime?: string
  trashed?: boolean
  appProperties?: Record<string, string>
}

function toFile(raw: Raw): DriveFile {
  return {
    id: String(raw.id),
    name: String(raw.name ?? ''),
    modifiedTime: String(raw.modifiedTime ?? ''),
    projectId: typeof raw.appProperties?.projectId === 'string' ? raw.appProperties.projectId : null,
  }
}

/**
 * Drive's REST API over `fetch`. `token` gives a valid access token, or throws
 * `AuthError`; a 401 or 403 is turned into one too, as either means signing in
 * again. Only the app's own files and folders are reachable (`drive.file`).
 */
export function driveClient(token: () => Promise<string>, fetcher: typeof fetch = (...args) => fetch(...args)): DriveClient {
  const call = async (url: string, init: RequestInit = {}, allow: number[] = []): Promise<Response> => {
    const headers = { ...(init.headers as Record<string, string> | undefined), Authorization: `Bearer ${await token()}` }
    let response: Response
    try {
      response = await fetcher(url, { ...init, headers })
    } catch {
      throw new DriveError(0, 'No connection to Google Drive')
    }
    if (response.ok || allow.includes(response.status)) return response
    if (response.status === 401 || response.status === 403) throw new AuthError()
    throw new DriveError(response.status, `Google Drive answered ${response.status}`)
  }

  /** A file's details and its content in one request, as Drive's multipart upload wants them. */
  const multipart = (metadata: object, content: unknown) => {
    const boundary = `boardcut${Math.random().toString(36).slice(2)}`
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(content)}\r\n--${boundary}--`
    return { headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body }
  }

  const list = async (query: string): Promise<DriveFile[]> => {
    const found: DriveFile[] = []
    let page = ''
    do {
      const params = new URLSearchParams({
        q: query,
        fields: `nextPageToken,files(${FIELDS})`,
        pageSize: '1000',
        spaces: 'drive',
        ...(page ? { pageToken: page } : {}),
      })
      const data = (await (await call(`${FILES}?${params}`)).json()) as { files?: Raw[]; nextPageToken?: string }
      found.push(...(data.files ?? []).map(toFile))
      page = data.nextPageToken ?? ''
    } while (page)
    return found
  }

  const inside = (parentId: string | null) => `${quote(parentId ?? 'root')} in parents`

  return {
    findFolder: async (name, parentId) => {
      const query = `mimeType=${quote(FOLDER_TYPE)} and name=${quote(name)} and ${inside(parentId)} and trashed=false`
      return (await list(query))[0]?.id ?? null
    },
    createFolder: async (name, parentId) => {
      const body = JSON.stringify({ name, mimeType: FOLDER_TYPE, ...(parentId ? { parents: [parentId] } : {}) })
      const headers = { 'Content-Type': 'application/json' }
      const created = (await (await call(`${FILES}?fields=id`, { method: 'POST', headers, body })).json()) as Raw
      return String(created.id)
    },
    listProjects: async (folderId) =>
      (await list(`${inside(folderId)} and trashed=false and mimeType!=${quote(FOLDER_TYPE)}`)).filter(
        (file) => file.projectId !== null,
      ),
    getFile: async (id) => {
      const response = await call(`${FILES}/${encodeURIComponent(id)}?fields=${FIELDS}`, {}, [404])
      if (response.status === 404) return null
      const raw = (await response.json()) as Raw
      return raw.trashed ? null : toFile(raw)
    },
    read: async (id) => (await call(`${FILES}/${encodeURIComponent(id)}?alt=media`)).json(),
    create: async (folderId, name, projectId, content) => {
      const { headers, body } = multipart(
        { name, mimeType: 'application/json', parents: [folderId], appProperties: { projectId } },
        content,
      )
      return toFile((await (await call(`${UPLOAD}?uploadType=multipart&fields=${FIELDS}`, { method: 'POST', headers, body })).json()) as Raw)
    },
    update: async (id, name, content) => {
      const { headers, body } = multipart({ name }, content)
      const url = `${UPLOAD}/${encodeURIComponent(id)}?uploadType=multipart&fields=${FIELDS}`
      return toFile((await (await call(url, { method: 'PATCH', headers, body })).json()) as Raw)
    },
    trash: async (id) => {
      await call(
        `${FILES}/${encodeURIComponent(id)}`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) },
        [404],
      )
    },
  }
}
