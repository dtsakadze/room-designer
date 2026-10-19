import { AuthError, type DriveClient, type DriveFile } from './drive'
import { newId } from './ids'
import type { ProjectData } from './project'

/**
 * What the last sync left a project as, on both sides. A project has changed
 * here since if its `updatedAt` or name isn't what was synced, and in Drive if
 * its file's `modifiedTime` isn't. Both clocks are only ever compared with
 * themselves.
 */
export type Link = { fileId: string; modifiedTime: string; syncedAt: string; syncedName: string }
export type Links = Record<string, Link>

/** A project here, as the list shows it. */
export type LocalProject = {
  id: string
  name: string
  updatedAt: string
  /** Saved by a newer version or damaged: never opened, so never sent either. */
  problem: boolean
}

export type Action =
  | { type: 'upload'; id: string }
  | { type: 'push'; id: string; fileId: string }
  | { type: 'pull'; id: string; file: DriveFile }
  | { type: 'import'; id: string; file: DriveFile }
  | { type: 'conflict'; id: string; file: DriveFile }

const SUFFIX = /\.json$/i
export const DEFAULT_PROJECT_NAME = 'Untitled project'

/** A project's file name in Drive. */
export const fileNameOf = (name: string) => `${name}.json`
/** The project name a file name gives; the file's name is the source of truth, so renaming it in Drive renames the project. */
export const projectNameOf = (fileName: string) => fileName.replace(SUFFIX, '').trim() || DEFAULT_PROJECT_NAME

/**
 * What to do to bring both sides level, one action per project:
 *
 * - only here: upload it as a new file; only in Drive: import it.
 * - on both, changed on one side since the last sync: send or fetch it.
 * - on both, changed on both (or never linked): a conflict. Nothing is lost:
 *   Drive's version is kept as a copy here and this device's version goes to Drive.
 * - a project that can't be opened is left alone on both sides.
 *
 * `remote` holds one file per project (see `oneFilePerProject`).
 */
export function planSync(local: LocalProject[], links: Links, remote: DriveFile[]): Action[] {
  const actions: Action[] = []
  const byProject = new Map(remote.map((file) => [file.projectId, file]))
  for (const project of local) {
    if (project.problem) continue
    const file = byProject.get(project.id)
    if (!file) {
      actions.push({ type: 'upload', id: project.id })
      continue
    }
    const link = links[project.id]
    if (!link || link.fileId !== file.id) {
      actions.push({ type: 'conflict', id: project.id, file })
      continue
    }
    const here = project.updatedAt !== link.syncedAt || project.name !== link.syncedName
    const there = file.modifiedTime !== link.modifiedTime
    if (here && there) actions.push({ type: 'conflict', id: project.id, file })
    else if (here) actions.push({ type: 'push', id: project.id, fileId: file.id })
    else if (there) actions.push({ type: 'pull', id: project.id, file })
  }
  const known = new Set(local.map((project) => project.id))
  for (const file of remote) {
    if (file.projectId && !known.has(file.projectId)) actions.push({ type: 'import', id: file.projectId, file })
  }
  return actions
}

/**
 * One file for each project. A project can only have more than one if a file
 * was copied in Drive: the one it's linked to wins, else the newest.
 */
export function oneFilePerProject(files: DriveFile[], links: Links): DriveFile[] {
  const best = new Map<string, DriveFile>()
  for (const file of files) {
    if (!file.projectId) continue
    const kept = best.get(file.projectId)
    const linked = (candidate: DriveFile) => links[file.projectId!]?.fileId === candidate.id
    if (!kept || (!linked(kept) && (linked(file) || file.modifiedTime > kept.modifiedTime))) best.set(file.projectId, file)
  }
  return [...best.values()]
}

/** What the sync needs from the projects kept here. */
export type LocalProjects = {
  list: () => LocalProject[]
  /** Writes the open project's latest edits, so what's sent is up to date. */
  flush: () => Promise<void>
  /** Whether the open project has edits that aren't saved yet: a file can't replace it then. */
  hasUnsavedEdits: (id: string) => boolean
  /** A saved project to send, or null when it can't be read. */
  read: (id: string) => Promise<{ name: string; updatedAt: string; data: ProjectData } | null>
  /** Saves a project from Drive (a new one, or over an existing one) without changing which is open. */
  write: (project: { id: string; name: string; data: ProjectData; updatedAt: string }) => Promise<void>
}

export type SyncDeps = {
  client: DriveClient
  folderId: string
  local: LocalProjects
  links: { get: () => Links; set: (links: Links) => void }
  /** Files to move to the trash: projects deleted here, whose file may not have been trashed yet. */
  trash: { get: () => string[]; set: (fileIds: string[]) => void }
  /** A file's JSON as a project, or null when it can't be opened. */
  parse: (raw: unknown) => ProjectData | null
}

export type SyncResult = {
  sent: number
  fetched: number
  /** Conflicts, each kept as a copy here. */
  conflicts: number
  /** Files that couldn't be opened (made by a newer version, or damaged), left as they are. */
  unreadable: number
  /** Edits made while it ran that were left for the next sync. */
  postponed: number
}

/**
 * One round of syncing: trash the files of deleted projects, look at what's in
 * Drive, then send, fetch or import what differs (see `planSync`). Progress is
 * written to the links after every file, so a failure part-way loses nothing
 * and the next round carries on. Errors are left to the caller.
 */
export async function syncOnce({ client, folderId, local, links, trash, parse }: SyncDeps): Promise<SyncResult> {
  const result: SyncResult = { sent: 0, fetched: 0, conflicts: 0, unreadable: 0, postponed: 0 }
  await local.flush()

  for (const fileId of trash.get()) {
    try {
      await client.trash(fileId)
    } catch (error) {
      if (error instanceof AuthError) throw error
      continue
    }
    trash.set(trash.get().filter((id) => id !== fileId))
  }
  const trashed = new Set(trash.get())

  const state = () => links.get()
  const link = (id: string, next: Link) => links.set({ ...state(), [id]: next })

  const listed = (await client.listProjects(folderId)).filter((file) => !trashed.has(file.id))
  // A linked project whose file isn't in the folder any more may have been moved elsewhere in Drive: it still counts then.
  for (const project of local.list()) {
    const known = state()[project.id]
    if (!known || listed.some((file) => file.id === known.fileId) || trashed.has(known.fileId)) continue
    const moved = await client.getFile(known.fileId)
    if (moved?.projectId === project.id) listed.push(moved)
  }
  const remote = oneFilePerProject(listed, state())

  const send = async (id: string, fileId: string | null) => {
    const project = await local.read(id)
    if (!project) return false
    const name = fileNameOf(project.name)
    const content = { ...project.data, name: project.name }
    const file = fileId ? await client.update(fileId, name, content) : await client.create(folderId, name, id, content)
    link(id, { fileId: file.id, modifiedTime: file.modifiedTime, syncedAt: project.updatedAt, syncedName: project.name })
    result.sent++
    return true
  }

  const fetchFile = async (id: string, file: DriveFile, copy: boolean) => {
    const data = parse(await client.read(file.id))
    if (!data) {
      result.unreadable++
      return false
    }
    const name = projectNameOf(file.name)
    if (copy) {
      await local.write({ id: newId(), name: `${name} (Drive copy)`, data, updatedAt: file.modifiedTime })
      result.conflicts++
      return true
    }
    if (local.hasUnsavedEdits(id)) {
      result.postponed++
      return false
    }
    await local.write({ id, name, data, updatedAt: file.modifiedTime })
    link(id, { fileId: file.id, modifiedTime: file.modifiedTime, syncedAt: file.modifiedTime, syncedName: name })
    result.fetched++
    return true
  }

  for (const action of planSync(local.list(), state(), remote)) {
    switch (action.type) {
      case 'upload':
        await send(action.id, null)
        break
      case 'push':
        await send(action.id, action.fileId)
        break
      case 'pull':
      case 'import':
        await fetchFile(action.id, action.file, false)
        break
      case 'conflict':
        // Drive's version is kept as a copy before this device's replaces it.
        if (await fetchFile(action.id, action.file, true)) await send(action.id, action.file.id)
        break
    }
  }
  return result
}

/** Links for a different folder don't apply: the files there are other files. */
export function linksFor(stored: { folderId?: unknown; links?: unknown } | null, folderId: string): Links {
  if (!stored || stored.folderId !== folderId || typeof stored.links !== 'object' || stored.links === null) return {}
  const links: Links = {}
  for (const [id, value] of Object.entries(stored.links)) {
    const v = value as Partial<Link> | null
    if (v && [v.fileId, v.modifiedTime, v.syncedAt, v.syncedName].every((field) => typeof field === 'string')) {
      links[id] = v as Link
    }
  }
  return links
}
